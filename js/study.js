/* The article on the site (7 November 2026): its three questions, Figs. 1 to 4, Tables 1 and 2, the supplement's tables
   and figures. Every number comes from data/*.json, which build_data.py fills from the results files with the article's
   own formatting. No program or institution is named outside the atlases. */
window.Study = (function () {
  const { load, $, esc, md, n, plot, paperTable, CLASS_FILL } = window.U;
  const tile = ([v, k]) => `<div class="tile"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  const rqText = (S, id) => { const r = S.rqs.find((x) => x.id === id); return r ? `${esc(r.id)}. ${esc(r.text)}` : ""; };
  const figTitle = (S, stem) => { const f = S.figures[stem]; return f ? `<b>Fig. ${f.number}.</b> ${md(f.caption.split(/:|\. /)[0])}` : ""; };

  /* ---------------------------------------------------------------- RQ1: requirements */
  async function requirements() {
    const [S, R, ST] = await Promise.all([load("study"), load("rq1"), load("states")]);
    $("rq1-text").textContent = rqText(S, "RQ1");
    const g = R.geography;
    $("rq1-tiles").innerHTML = [[`${g.fit_floor} of ${R.programs}`, "programs reach 90 credits at ACCE’s credit minima"],
      [g.fit_today, "under the rules that apply to each program today"],
      [g.fit_overlap, `with up to ${R.fig1.overlap} major credits counted as general education in every state (policy scenario)`],
      [g.fit_core, "with institutional cores in place of the binding minima"]].map(tile).join("");

    /* Fig. 1 */
    $("fig1-title").innerHTML = figTitle(S, "Figure_geography");
    const C = R.fig1.classes, pos = ST.pos, cls = ST.class_of_state, sidx = Object.fromEntries(ST.states.map((s) => [s.state, s]));
    const cols = Math.max(...Object.values(pos).map((p) => p[0])) + 1, rowsN = Math.max(...Object.values(pos).map((p) => p[1])) + 1;
    const map = $("fig1-map");
    map.style.aspectRatio = `${cols} / ${rowsN}`;
    map.innerHTML = Object.entries(pos).map(([st, [x, y]]) => {
      const k = cls[st], s = sidx[st] || {}, c = C[k];
      const tip = [s.name || st, `General education minimum for public universities: ${c.label}`,
        s.binding_count != null ? `Binding count: ${n(s.binding_count)} credits (${s.count_source})` : "",
        s.institutional_accreditor ? `Institutional accreditor: ${s.institutional_accreditor}` : "",
        `Verified action, 6 November 2026: ${s.class_label || "no action found"}`,
        `Accredited or applicant programs: ${s.programs ?? 0}; modeled: ${s.modeled ?? 0}`].filter(Boolean).join("\n");
      return `<div class="st c${k}${c.high ? " hi" : ""}${c.none ? " none" : ""}" data-k="${k}" data-tip="${esc(tip)}" style="left:${(100 * x / cols).toFixed(3)}%;top:${(100 * y / rowsN).toFixed(3)}%;width:${(100 / cols - .7).toFixed(3)}%;height:${(100 / rowsN - .9).toFixed(3)}%;background:${CLASS_FILL[k]}">${esc(st)}</div>`;
    }).join("");
    const maxShare = Math.max(...C.map((c) => Math.max(c.grad, c.jobs)));
    $("fig1-rows").innerHTML = `<div class="f1head"><span></span><span>Share of U.S. total</span><span>Programs meeting the 90-credit threshold</span></div>` + C.map((c, k) => `
      <div class="f1row${c.high ? " strong" : ""}" data-k="${k}">
        <div class="f1lab"><span class="sw c${k}${c.none ? " none" : ""}${c.high ? " hi" : ""}" style="background:${CLASS_FILL[k]}"></span><span>${esc(c.label)}<br><span class="muted small">${esc(c.states)}</span></span></div>
        <div class="f1bars">
          <div class="hb" data-tip="Construction bachelor’s degrees, ${esc(R.fig1.year_degrees)}: ${c.grad_txt} of the U.S. total"><i class="deg" style="width:${(76 * c.grad / maxShare).toFixed(1)}%"></i><b>${c.grad_txt}</b></div>
          <div class="hb" data-tip="Construction manager employment, May ${esc(R.fig1.year_jobs)}: ${c.jobs_txt} of the U.S. total"><i class="job" style="width:${(76 * c.jobs / maxShare).toFixed(1)}%"></i><b>${c.jobs_txt}</b></div>
        </div>
        <div class="f1dots" data-tip="At ACCE’s credit minima: ${c.floor} of ${c.N}\nWith major-credit overlap: ${c.over} of ${c.N}">
          <div class="track"><i class="seg" style="left:${(100 * c.floor / c.N).toFixed(1)}%;width:${(100 * (c.over - c.floor) / c.N).toFixed(1)}%"></i><i class="o" style="left:${(100 * c.floor / c.N).toFixed(1)}%"></i><i class="f" style="left:${(100 * c.over / c.N).toFixed(1)}%"></i></div>
          <span class="muted small">${c.floor}/${c.N} → ${c.over}/${c.N}</span>
        </div>
      </div>`).join("") + `<div class="f1key"><span><i class="deg"></i>Construction bachelor’s degrees, ${esc(R.fig1.year_degrees)}</span><span><i class="job"></i>Construction manager employment, May ${esc(R.fig1.year_jobs)}</span><span><i class="dot o"></i>ACCE credit minima</span><span><i class="dot f"></i>with major-credit overlap</span></div>`;
    const rowsEl = $("fig1-rows");
    let sel = null;
    rowsEl.querySelectorAll(".f1row").forEach((r) => r.addEventListener("click", () => {
      const k = r.dataset.k;
      sel = sel === k ? null : k;
      rowsEl.querySelectorAll(".f1row").forEach((x) => x.classList.toggle("on", x.dataset.k === sel));
      map.classList.toggle("dim", sel != null);
      map.querySelectorAll(".st").forEach((t) => t.classList.toggle("sel", t.dataset.k === sel));
    }));
    $("fig1-note").textContent = `Major-credit overlap allows up to ${R.fig1.overlap} construction credits to satisfy general education requirements. Program counts are of the ${R.programs} modeled programs.`;

    /* ACCE and ANSAC */
    $("acc-table").innerHTML = `<thead><tr><th>Design</th><th class="n">Programs meeting 90 credits (of ${esc(R.programs)})</th><th class="n">Median minimum credits</th><th class="n">Internship omitted (of ${esc(R.internship_listed)} programs that list one)</th></tr></thead><tbody>` +
      R.designs.map((d) => `<tr><td><b>${esc(d.design)}</b><br><span class="muted small">${esc(d.detail)}</span></td><td class="n">${esc(d.fit)}</td><td class="n">${esc(d.median)}</td><td class="n">${esc(d.internship)}${d.internship_b ? `<br><span class="muted small">${esc(d.internship_b)} with outcomes read from catalog descriptions</span>` : ""}</td></tr>`).join("") + "</tbody>";
    $("acc-note").textContent = "Minimum-credit designs without major-credit overlap.";
    const F = R.floors;
    const bars = [["ACCE minimum of construction and business credits", F.acce_professional, "#BFBFBF"], ["Courses whose titles name ACCE’s outcomes (median)", F.titles, "#D4EBF2"],
      ["Courses whose descriptions document them (median)", F.descriptions, "#D9EAD3"], ["The same, stricter coding (median)", F.descriptions_strict, "#D9EAD3"]];
    plot("floors-chart", [{ type: "bar", orientation: "h", y: bars.map((b) => b[0]), x: bars.map((b) => Number(b[1])), text: bars.map((b) => b[1]), textposition: "outside", cliponaxis: false,
      marker: { color: bars.map((b) => b[2]), line: { color: "#333", width: .6 } }, hovertemplate: "%{y}: %{text} credits<extra></extra>" }],
    { margin: { l: 300, r: 30, t: 6, b: 36 }, xaxis: { title: { text: "credits" }, range: [0, Number(F.acce_professional) * 1.15] }, yaxis: { autorange: "reversed", automargin: true } });
    const A = R.arithmetic;
    $("eq").innerHTML = `<div class="eqrow"><span class="chip on">${esc(A.professional)}</span><span>ACCE professional credits</span><b>+</b><span class="chip on">${esc(A.count)}</span><span>general education</span><b>−</b><span class="chip on">${esc(A.economics)}</span><span>economics counted for both</span><b>=</b><span class="chip on">90</span></div>
      <div class="eqrow"><span>Representative program:</span><span class="chip">${esc(A.typical_total)}</span><span>credits under a ${esc(A.typical_count)}-credit requirement;</span><span class="chip">${esc(A.highest_total)}</span><span>under ${esc(A.highest_count)} credits (${esc(A.added)} more)</span></div>`;
    paperTable("t1", R.table1);
    paperTable("ts1", R.tableS1);
  }

  /* ---------------------------------------------------------------- RQ2: integration */
  async function integration() {
    const [S, R] = await Promise.all([load("study"), load("rq2")]);
    $("rq2-text").textContent = rqText(S, "RQ2");
    /* Fig. 2 */
    $("fig2-title").innerHTML = figTitle(S, "Figure_integration");
    const F2 = R.fig2;
    const lim = Math.max(...F2.within.map((r) => Math.max(r.one, r.sep)), ...F2.gened.map((r) => r.one), ...F2.blocked.map((r) => r.sep)) + 6;
    const ticks = [-40, -20, 0, 20, 40].filter((v) => Math.abs(v) < lim);
    const axis = { range: [-lim, lim], tickvals: ticks, ticktext: ticks.map((v) => String(Math.abs(v))), zeroline: true, zerolinecolor: "#555", title: { text: "accredited programs" } };
    plot("fig2a", [
      { type: "bar", orientation: "h", name: "taught as two courses", y: F2.within.map((r) => r.label), x: F2.within.map((r) => -r.sep), marker: { color: "#BFBFBF", line: { color: "#333", width: .5 } },
        text: F2.within.map((r) => (r.sep ? String(r.sep) : "")), textposition: "outside", cliponaxis: false,
        customdata: F2.within.map((r) => [r.sep, r.could]), hovertemplate: "<b>%{y}</b><br>Taught as two courses: %{customdata[0]} programs<br>Modeled programs that could merge it: %{customdata[1]}<extra></extra>" },
      { type: "bar", orientation: "h", name: "taught as one course", y: F2.within.map((r) => r.label), x: F2.within.map((r) => r.one), marker: { color: "#D4EBF2", line: { color: "#333", width: .5 } },
        text: F2.within.map((r) => String(r.one)), textposition: "outside", cliponaxis: false, hovertemplate: "<b>%{y}</b><br>Taught as one course: %{x} programs<extra></extra>" }],
    { barmode: "relative", showlegend: true, legend: { orientation: "h", y: 1.02, yanchor: "bottom", x: 0 }, margin: { l: 210, r: 20, t: 30, b: 40 }, xaxis: axis, yaxis: { autorange: "reversed", automargin: true }, height: 34 * F2.within.length + 110 });
    $("fig2a-could").innerHTML = `Modeled programs that teach a pair as two courses and could merge it: ${F2.within.map((r) => `${esc(r.label)} ${r.could}`).join("; ")}. ${F2.with_a_merge} of the ${F2.programs} modeled programs could merge at least one pair.`;
    const yb = [...F2.gened.map((r) => r.label), ...F2.blocked.map((r) => r.label)];
    plot("fig2b", [
      { type: "bar", orientation: "h", name: F2.head_gened, y: F2.gened.map((r) => r.label), x: F2.gened.map((r) => r.one), marker: { color: "#D4EBF2", line: { color: "#333", width: .5 } },
        text: F2.gened.map((r) => String(r.one)), textposition: "outside", cliponaxis: false, hovertemplate: "<b>%{y}</b><br>Programs whose construction courses carry it: %{x}<extra></extra>" },
      { type: "bar", orientation: "h", name: F2.head_blocked, y: F2.blocked.map((r) => r.label), x: F2.blocked.map((r) => -r.sep), marker: { color: "#BFBFBF", line: { color: "#333", width: .5 } },
        text: F2.blocked.map((r) => String(r.sep)), textposition: "outside", cliponaxis: false, customdata: F2.blocked.map((r) => r.sep), hovertemplate: "<b>%{y}</b><br>Programs teaching both as two courses: %{customdata}<extra></extra>" }],
    { barmode: "relative", showlegend: true, legend: { orientation: "h", y: 1.02, yanchor: "bottom", x: 0 }, margin: { l: 210, r: 20, t: 52, b: 40 }, xaxis: Object.assign({}, axis, { title: { text: "programs" } }),
      yaxis: { autorange: "reversed", automargin: true, categoryorder: "array", categoryarray: yb }, height: 34 * yb.length + 130 });

    /* Fig. 3 */
    $("fig3-title").innerHTML = figTitle(S, "Figure_scenarios");
    const F3 = R.fig3;
    const head = F3.cols.map((c) => `<div class="c3h${c.check ? " chk" : ""}">${esc(c.label)}</div>`).join("");
    const body = F3.rows.map((r) => `<div class="c3r"><b>${esc(r.label)}</b>${r.detail ? `<br><span class="muted small">${esc(r.detail)}</span>` : ""}</div>` + F3.cols.map((c) => {
      const v = c.cells[r.key];
      return `<div class="c3${c.check ? " chk" : ""}" data-tip="${esc(c.label)}, ${esc(r.label.toLowerCase())}: ${v.fit} of ${F3.programs} programs at ${F3.target} credits or fewer; median minimum ${v.median} credits">
        <div class="c3n"><b>${v.fit}</b> of ${F3.programs}</div><div class="c3bar"><i style="width:${(100 * v.fit / F3.programs).toFixed(1)}%"></i></div><div class="muted small">median ${v.median} credits</div></div>`;
    }).join("")).join("");
    $("fig3").innerHTML = `<div class="c3grid"><div></div>${head}${body}</div>`;
    $("fig3-note").textContent = `Programs are feasible when their minimum required credits do not exceed ${F3.target}. Medians are calculated across all ${F3.programs} programs. Overlap allows up to ${F3.overlap} major credits to satisfy general education requirements. Lighter columns, for comparison, drop ACCE’s credit minima.`;
    const L = R.levers;
    $("levers").innerHTML = [[L.median_gap_above_90_every_course_kept, "median credits above 90 when every course is kept"], [L.median_merging_saving, "median credits saved by merging"],
      [`up to ${F3.overlap}`, "credits counted by the overlap"], [L.fit_only_with_both, "programs reach 90 only when both are available"],
      [R.today_topics, "programs reach 90 under current rules while keeping every topic"]].map(tile).join("");

    /* Fig. 4 */
    $("fig4-title").innerHTML = figTitle(S, "Figure_redesign");
    const F4 = R.fig4;
    const FILL = { ms: "#D4EBF2", listed: "#EAD1DC", added: "#C27BA0", business: "#B2B2B2", construction: "#C2DDB4" };
    const name = Object.fromEntries(F4.key);
    const max = F4.rows[0].total;
    $("fig4").innerHTML = F4.rows.map((r, i) => {
      const segs = ["ms", "listed", "added", "business", "construction"].filter((k) => r.parts[k] > 0).map((k) => {
        const w = 100 * r.parts[k] / max;
        const ov = k === "construction" && r.overlap ? `<i class="ovl" style="width:${(100 * r.overlap / r.parts[k]).toFixed(2)}%" data-tip="${esc(name.construction)} also counted toward general education: ${n(r.overlap, 1)} credits"></i>` : "";
        return `<span class="seg${k === "listed" ? " dots" : ""}" style="width:${w.toFixed(2)}%;background:${FILL[k]}" data-tip="${esc(name[k])}: ${n(r.parts[k], 1)} credits">${ov}</span>`;
      }).join("");
      const step = i > 0 ? `<div class="wfstep${r.comparison ? " cmp" : ""}"><b>−${n(F4.deltas[i - 1], 1)}</b> ${esc(F4.steps[i - 1])}</div>` : "";
      return `${step}<div class="wfrow${r.comparison ? " cmp" : ""}"><div class="wflab">${esc(r.name)}</div><div class="wfbar"><div class="wfin">${segs}</div><i class="t90" style="left:${(100 * F4.target / max).toFixed(2)}%"></i></div><div class="wftot">${n(r.total, 1)}</div></div>`;
    }).join("");
    $("fig4-key").innerHTML = F4.key.map(([k, lab]) => `<span class="lg"><span class="sw${k === "listed" ? " dots" : ""}" style="background:${FILL[k]}"></span>${esc(lab)}</span>`).join("") +
      `<span class="lg"><span class="sw ovl"></span>Construction credits also counted toward general education</span><span class="lg"><span class="sw line90"></span>90 credits</span>`;
    paperTable("ts3", R.tableS3);
    paperTable("ts5", R.tableS5);
    paperTable("ts6", R.tableS6);
  }

  /* ---------------------------------------------------------------- RQ3: documented content */
  async function content() {
    const [S, R] = await Promise.all([load("study"), load("rq3")]);
    $("rq3-text").textContent = rqText(S, "RQ3");
    const f = R.facts;
    $("rq3-tiles").innerHTML = [[`${f.observations_found} of ${f.observations}`, `required course observations with a catalog description (${f.share_found})`],
      [`${f.concepts_dropped} of ${f.concepts_read}`, `concepts that existing merged courses name less than half as often as courses on one topic (${f.concepts_dropped_sig} significant)`],
      [f.multi_topic_titles, `courses whose titles name two or more topics: ${f.renaming_lenient} document fewer topics with one concept per topic, ${f.renaming_strict} with two`],
      [f.plain_titles, `courses whose titles name no construction topic: ${f.hidden_lenient} document two or more topics with one concept per topic, ${f.hidden_strict} with two`]].map(tile).join("");
    const colA = "#BFBFBF", colB = "#D9EAD3";
    const lo = R.range.map((r, i) => R.models[1].values[i] - r[0]), hi = R.range.map((r, i) => r[1] - R.models[1].values[i]);
    plot("ab-chart", [
      { type: "bar", name: R.models[0].label, x: R.scenarios, y: R.models[0].values, text: R.models[0].values.map(String), textposition: "outside", cliponaxis: false, marker: { color: colA, line: { color: "#333", width: .6 } },
        hovertemplate: `${esc(R.models[0].label)}<br>%{x}: %{y} programs<extra></extra>` },
      { type: "bar", name: R.models[1].label, x: R.scenarios, y: R.models[1].values, text: R.models[1].values.map(String), textposition: "outside", cliponaxis: false, marker: { color: colB, line: { color: "#333", width: .6 } },
        error_y: { type: "data", symmetric: false, array: hi, arrayminus: lo, color: "#555", thickness: 1, width: 6 }, customdata: R.range.map((r) => (r[0] === r[1] ? String(r[0]) : `${r[0]} to ${r[1]}`)),
        hovertemplate: `${esc(R.models[1].label)}<br>%{x}: %{y} programs<br>Alternative retention thresholds: %{customdata}<extra></extra>` }],
    { barmode: "group", showlegend: true, legend: { orientation: "h", y: 1.04, yanchor: "bottom", x: 0 }, margin: { l: 50, r: 10, t: 34, b: 40 }, yaxis: { title: { text: "programs meeting the 90-credit threshold" }, rangemode: "tozero" } });
    $("ab-note").textContent = `Whiskers: Model B under alternative concept-retention thresholds. Median minimum with nationwide overlap: ${f.median_a} credits under Model A, ${f.median_b} under Model B.`;
    paperTable("t2", R.table2);

    /* Table S4 by course pair */
    const P = R.pairs;
    $("pair-chips").innerHTML = P.map((p, i) => `<span class="chip${i === 0 ? " on" : ""}" data-i="${i}">${esc(p.label)}</span>`).join("");
    function pair(i) {
      const p = P[i];
      $("pair-chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", Number(c.dataset.i) === i));
      const merges = p.merges_a == null ? "not merged by the model" : `merged by the model in ${p.merges_a} programs under Model A and ${p.merges_b} under Model B`;
      const dropped = p.concepts.filter((c) => c.dropped).length, sig = p.concepts.filter((c) => c.significant).length;
      $("pair-head").innerHTML = [[p.merged_courses, "merged courses described"], [`${dropped} of ${p.concepts.length}`, `concepts named less than half as often (${sig} significant)`], [p.merges_a == null ? "none" : `${p.merges_a} → ${p.merges_b}`, merges]].map(tile).join("");
      const C = p.concepts.slice().sort((a, b) => b.single - a.single);
      const y = C.map((c) => `${c.topic}: ${c.concept}${c.significant ? " *" : ""}`);
      const lines = { type: "scatter", mode: "lines", x: C.flatMap((c) => [100 * c.merged, 100 * c.single, null]), y: C.flatMap((c, k) => [y[k], y[k], null]), line: { color: "#9a9a9a", width: 2 }, hoverinfo: "skip", showlegend: false };
      const tip = C.map((c) => `<b>${esc(c.topic)}: ${esc(c.concept)}</b><br>Merged courses naming it: ${c.merged_txt}<br>Single-topic courses naming it: ${c.single_txt} (${c.single_courses} courses)<br>Dropped by merging: ${c.dropped ? "yes" : "no"}${c.dropped ? `; shortfall significant: ${c.significant ? "yes" : "no"}` : ""}`);
      plot("pair-chart", [lines,
        { type: "scatter", mode: "markers", name: "single-topic courses", x: C.map((c) => 100 * c.single), y, marker: { size: 10, color: "white", line: { color: "#333", width: 1.2 } }, text: tip, hovertemplate: "%{text}<extra></extra>" },
        { type: "scatter", mode: "markers", name: "merged courses", x: C.map((c) => 100 * c.merged), y, marker: { size: 10, color: C.map((c) => (c.dropped ? "#C27BA0" : "#1F4E79")), line: { color: "#333", width: .6 } }, text: tip, hovertemplate: "%{text}<extra></extra>" }],
      { showlegend: true, legend: { orientation: "h", y: 1.02, yanchor: "bottom", x: 0 }, margin: { l: 260, r: 20, t: 30, b: 44 }, xaxis: { title: { text: "share of courses whose description names the concept (%)" }, range: [-3, 103], ticksuffix: "%" },
        yaxis: { autorange: "reversed", automargin: true }, height: 26 * C.length + 110 });
    }
    $("pair-chips").querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => pair(Number(c.dataset.i))));
    $("pair-note").textContent = "Pink: concepts that merged courses name less than half as often as courses on one topic (dropped under the main rule of Model B); an asterisk marks a significant shortfall (one-sided Fisher exact test, p < .05). Descriptions record what catalogs say, not what courses teach.";
    pair(0);
    paperTable("ts4", R.tableS4);
  }

  /* ---------------------------------------------------------------- beyond the curriculum */
  async function beyond() {
    const [S, R] = await Promise.all([load("study"), load("beyond")]);
    const S1 = R.figS1, sf = S.supplement_figures;
    $("figS1-title").innerHTML = `<b>Figure S1.</b> ${md(sf.S1 ? sf.S1.short : "")}`;
    const LINE = ["#6C9FCB", "#3A7DB5", "#0E3D6B"], BAND = ["rgba(108,159,203,.18)", "rgba(58,125,181,.18)", "rgba(14,61,107,.18)"];
    const tr = [];
    S1.students.forEach((s, i) => {
      tr.push({ type: "scatter", mode: "lines", x: [...s.x, ...s.x.slice().reverse()].map((v) => 100 * v), y: [...s.hi, ...s.lo.slice().reverse()].map((v) => v / 1000), fill: "toself", fillcolor: BAND[i], line: { width: 0 }, hoverinfo: "skip", showlegend: false });
      tr.push({ type: "scatter", mode: "lines", name: `${s.name} (break-even at ${s.be_txt})`, x: s.x.map((v) => 100 * v), y: s.md.map((v) => v / 1000), line: { color: LINE[i], width: 2.2 },
        hovertemplate: `${esc(s.name)}<br>pay penalty %{x:.1f}%<br>median net benefit %{y:.1f} thousand dollars<extra></extra>` });
    });
    tr.push({ type: "scatter", mode: "lines", name: S1.flat.name, x: S1.flat.x.map((v) => 100 * v), y: S1.flat.md.map((v) => v / 1000), line: { color: "#4D4D4D", width: 1.2, dash: "dash" },
      hovertemplate: `${esc(S1.flat.name)}<br>pay penalty %{x:.1f}%<br>median net benefit %{y:.1f} thousand dollars<extra></extra>` });
    plot("figS1a", tr, { showlegend: true, legend: { orientation: "h", y: -.3, x: 0, font: { size: 11 } }, margin: { l: 60, r: 10, t: 10, b: 110 },
      xaxis: { title: { text: "pay penalty (percent of earnings every year)" }, ticksuffix: "%" }, yaxis: { title: { text: "net benefit (thousand dollars)" }, zeroline: true, zerolinecolor: "#555" }, height: 380 });
    const INST = ["#8C4A12", "white"];
    plot("figS1b", S1.institutions.map((b, i) => ({ type: "scatter", mode: "markers+text", name: `${b.basis} (${b.with_break_even} of ${b.programs} programs)`, x: b.k.map((k) => `${k === 1 ? "1" : String(k).replace(/^0\./, ".")}`), y: b.md.map((v) => 100 * v),
      error_y: { type: "data", symmetric: false, array: b.hi.map((v, j) => 100 * (v - b.md[j])), arrayminus: b.lo.map((v, j) => 100 * (b.md[j] - v)), color: "#8C4A12", thickness: 1.2, width: 5 },
      marker: { size: 10, color: INST[i], line: { color: "#8C4A12", width: 1.4 } }, text: b.md_txt, textposition: i === 0 ? "middle left" : "middle right", textfont: { size: 11 }, offsetgroup: String(i),
      hovertemplate: `${esc(b.basis)}<br>relative cost of a removed credit %{x}<br>median break-even share %{text}<extra></extra>` })),
    { showlegend: true, legend: { orientation: "h", y: -.3, x: 0, font: { size: 11 } }, margin: { l: 60, r: 10, t: 10, b: 110 }, scattermode: "group",
      xaxis: { title: { text: "cost of a removed credit, relative to the average credit" }, type: "category" }, yaxis: { title: { text: "new students, % of the 90-credit cohort" }, ticksuffix: "%", rangemode: "tozero" }, height: 380 });
    $("figS1-note").textContent = `Hypothetical thresholds under stated assumptions, not observed outcomes: ${S1.programs} programs, a ${S1.horizon}-year career, 3% discount rate; lines are medians and bands the middle half; whiskers run from the 25th to the 75th percentile.`;
    paperTable("ts7", R.tableS7);
    const G = R.figS2.groups;
    $("figS2-title").innerHTML = `<b>Figure S2.</b> ${md(sf.S2 ? sf.S2.short : "")} (exploratory)`;
    plot("figS2", [
      { type: "scatter", mode: "markers+text", name: "AI task exposure", x: G.map((g) => g.expo), y: G.map((g) => g.group), text: G.map((g) => g.expo_txt), textposition: "middle right", marker: { size: 11, color: "#FDBE85", line: { color: "#A63603", width: 1 } },
        hovertemplate: "<b>%{y}</b><br>AI task exposure %{text}<extra></extra>", xaxis: "x", yaxis: "y" },
      { type: "bar", orientation: "h", name: "mean credits per program today", x: G.map((g) => g.today), y: G.map((g) => g.group), text: G.map((g) => g.today_txt), textposition: "outside", cliponaxis: false,
        marker: { color: "#BFBFBF", line: { color: "#333", width: .5 } }, hovertemplate: "<b>%{y}</b><br>mean credits per program today %{text}<extra></extra>", xaxis: "x2", yaxis: "y" }],
    { showlegend: false, margin: { l: 250, r: 30, t: 30, b: 44 }, grid: { columns: 2, rows: 1 },
      xaxis: { domain: [0, .48], range: [0, 1.08], title: { text: "a) AI task exposure (0 to 1)" }, tickvals: [0, .25, .5, .75, 1], ticktext: ["0", ".25", ".5", ".75", "1"] },
      xaxis2: { domain: [.56, 1], title: { text: `b) mean credits per program today (${R.figS2.programs} programs)` }, rangemode: "tozero" },
      yaxis: { autorange: "reversed", automargin: true }, height: 30 * G.length + 110 });
    $("figS2-note").textContent = "Exposure describes the tasks a course group trains, from an external rating of tasks (Eloundou et al., 2024); it is not a measure of what students learn or of what a shorter degree could remove.";
    paperTable("ts2", R.tableS2);
  }

  /* ---------------------------------------------------------------- sources */
  async function sources() {
    const D = await load("sources");
    $("refs-list").innerHTML = D.references.map((r) => `<li>${md(r.apa).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u.replace(/\.$/, "")}" target="_blank" rel="noopener">${u}</a>`)}</li>`).join("");
    window.U.table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Read or released" },
      { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }], D.data);
    const files = ["study", "atlas", "courses", "states", "rq1", "rq2", "rq3", "beyond", "uk", "hk"].concat(window.App && window.App.australia ? ["au"] : []).concat(["sources"]);
    $("files-list").innerHTML = files.map((f) => `<li><a href="data/${f}.json" target="_blank">data/${f}.json</a></li>`).join("");
  }

  return { requirements, integration, content, beyond, sources };
})();
