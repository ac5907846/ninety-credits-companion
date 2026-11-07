/* Who holds 120 and Routes to 90 (6 November 2026, night): the holders of the credits, the states grouped by the general
   education count a reduced-credit degree must carry, and the integer program of Module 14. Every number is read from
   data/model.json, data/states.json and data/paper.json; none is typed here. No program is named. */
window.Model = (function () {
  const { load, $, esc, n, share, plot } = window.U;
  const GFILL = { "30 or fewer": "#F7E4ED", "31 to 36": "#E9BCD2", "37 to 40": "#D58FB2", "41 to 43": "#A64D79", "No state or accreditor count": "#FFFFFF" };
  const GSHORT = { "30 or fewer": "30 or fewer", "31 to 36": "31 to 36", "37 to 40": "37 to 40", "41 to 43": "41 to 43", "No state or accreditor count": "no count" };
  const GTEXT = { "41 to 43": "white" };
  const CLASS_SYM = { programs: ["circle", "#222", "#222"], rule: ["circle-open", "#222", "#222"], proposal: ["triangle-up-open", "#222", "#222"] };
  const POS = { AK: [0, 0], ME: [11, 0], VT: [10, 1], NH: [11, 1], WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], WI: [5, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
    OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IL: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3],
    CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
    AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5], OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
    HI: [0, 7], TX: [3, 7], FL: [8, 7] };  // tile positions, as in the article’s Figure 1a
  const HOLDER = { acce: ["ACCE floors", "#F6C89F"], ansac: ["ABET ANSAC text", "#FBE3CF"], keep: ["keep today’s courses", "#D4EBF2"] };
  const PART = [["mean_construction", "construction courses", "#F6C89F"], ["mean_business", "business courses", "#FBE3CF"],
    ["mean_math_science", "mathematics and science (count as general education)", "#D9EAD3"], ["mean_gen_ed_added", "general education the design adds to reach the count", "#E9BCD2"]];
  const SRC = { state: "the state or system count", accreditor: "the institutional accreditor’s count", institution: "no state or accreditor count; the institution’s own core decides" };
  const of = (a, b) => (a === 0 ? `none of ${b}` : `${a} of ${b}`);  // zero counts read as “none”, as in the article
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = (d) => { if (!d) return ""; const [y, m, dd] = d.split("-").map(Number); return dd === 1 ? `${MONTHS[m - 1]} ${y}` : `${dd} ${MONTHS[m - 1]} ${y}`; };

  function swatches(items) {
    return items.map(([lab, col, line]) => `<span class="lg"><span class="sw" style="background:${col};border-color:${line || "#9a9a9a"}"></span>${esc(lab)}</span>`).join("");
  }

  /* ---------------------------------------------------------------- Who holds 120 */
  async function holders() {
    const [M, ST, PA, R] = await Promise.all([load("model"), load("states"), load("paper"), load("rules")]);
    const S = M.summary, al = S.all, ra = S.rule_arithmetic, N = S.programs_modeled, H = M.hours, st = PA.study;
    $("holders-lede").innerHTML = esc(st.abstract);
    $("study-rqs").innerHTML = st.rqs.map((q) => `<li>${esc(q)}</li>`).join("");
    $("study-theory").innerHTML = st.theory.slice(0, 2).map((p) => `<p>${esc(p)}</p>`).join("");
    const fg = (g, a, c, o) => S.fit_by_group[`${g}|${a}|${c}|${o}`];
    const OV = ra.overlap;
    const byGroup = M.group_order.map((g) => { const f = fg(g, "ACCE", "floor", 0); return `${of(f.fit, f.programs)} ${g === "No state or accreditor count" ? "where the institution’s core decides" : `at ${g}`}`; }).join(", ");
    const result = [
      `ACCE’s floors claim ${ra.acce_professional} hours; the courses that name ABET ANSAC’s topics and outcomes, a median ${n(H.ANSAC.median)}; the highest count a state asks, ${n(S.count_range_states[1])}; today’s construction and business courses, a median ${n(S.keep_professional_median)}.`,
      `Cut to ACCE’s floors, ${of(al["ACCE|floor|0|binding"].fit, N)} programs fit 90: ${byGroup}. The median count a design at the floors can carry is ${n(S.carry_median["ACCE|floor|0"])}, against the ${ra.acce_threshold_count} the rules predict.`,
      `With ${OV} major hours counted as general education, ${of(al[`ACCE|floor|${OV}|binding`].fit, N)} fit; the overlap brings in ${S.h3.brought_in_by_overlap} of the ${S.h3.outside_at_floor} programs that a cut to the floors leaves outside.`,
      `The construction courses that name ACCE’s outcomes take a median ${n(H.ACCE.median)} hours against the floor of ${R.acce.construction_min}; held to the outcomes without the floors, ${of(S.acce_outcomes_only["0"].fit, N)} fit; at ABET ANSAC’s text, ${of(al["ANSAC|floor|0|binding"].fit, N)}.`,
      `Keeping today’s courses, ${of(al["ACCE|keep|0|binding"].fit, N)} fit, ${al[`ACCE|keep|${OV}|binding`].fit} with the overlap; the same under either accreditor.`];
    $("study-hyp").innerHTML = st.hypotheses.map((h, i) => `<li><span class="hq">${esc(h)}</span><span class="hr">Test: ${esc(result[i] || "")}</span></li>`).join("");
    tileMap(ST);
    claims(M);
    $("claims-note").textContent = `Each group is drawn at its highest count (no count: the median of the programs’ own cores, ${n(S.holder_claims["No state or accreditor count"].count)} hours). ACCE floors: ${R.acce.construction_min} construction and ${R.acce.business_management_min} business hours, less the ${ra.economics_counted_twice} hours of economics counted for both; ABET ANSAC text: the courses that name its topics and outcomes, a median ${n(H.ANSAC.median)} hours; keep: today’s construction and business courses, a median ${n(S.keep_professional_median)} hours, less the economics counted for both.`;
    window.Paper.paperTable("holds", PA.tables.holds);
  }

  function stateCard(s) {
    const cnt = s.binding_count != null ? `${n(s.binding_count)} hours` : "none";
    return `<h4>${esc(s.name)} <span class="muted">(${esc(s.state)})</span></h4><dl>
      <dt>Group</dt><dd>${esc(s.group === "No state or accreditor count" ? "no state or accreditor count" : s.group + " hours")}</dd>
      <dt>Count that binds a public reduced-credit degree</dt><dd>${esc(cnt)}, ${esc(SRC[s.count_source] || "")}</dd>
      <dt>State or system count</dt><dd>${s.state_min != null ? n(s.state_min) + " hours" : "none for a bachelor’s degree"}${s.scope ? ` (${esc(s.scope)})` : ""}${s.basis ? `; ${esc(s.basis)}` : ""}</dd>
      <dt>Institutional accreditor</dt><dd>${esc(s.institutional_accreditor || "not read")}${s.accreditor_min != null ? `, ${n(s.accreditor_min)} hours` : ", no hour count"}</dd>
      ${s.overlap_rule ? `<dt>Overlap rule</dt><dd>${esc(s.overlap_rule)}</dd>` : ""}
      <dt>Verified action, 6 November 2026</dt><dd>${esc(s.class_label)}${s.action ? `: ${esc(s.action)}` : ""}${s.date ? ` (${esc(day(s.date))})` : ""}${s.note && s.note !== "verified" ? `; ${esc(s.note)}` : ""}</dd>
      <dt>Construction named</dt><dd>${s.construction_named ? "yes, in a proposal or a statement; no program" : "no"}</dd>
      <dt>Accredited or applicant programs</dt><dd>${n(s.programs)} (${n(s.public)} public; ${n(s.modeled)} modeled)</dd></dl>`;
  }

  function tileMap(ST) {
    const S = ST.states.filter((s) => POS[s.state]);
    const shapes = S.map((s) => ({ type: "rect", xref: "x", yref: "y", x0: POS[s.state][0] - .46, x1: POS[s.state][0] + .46, y0: -POS[s.state][1] - .46, y1: -POS[s.state][1] + .46,
      fillcolor: GFILL[s.group], line: { color: s.group === "No state or accreditor count" ? "#9a9a9a" : "white", width: 1 }, layer: "below" }));
    const hover = S.map((s) => `<b>${esc(s.name)}</b><br>Count that binds: ${s.binding_count != null ? n(s.binding_count) + " hours" : "none"} (${esc(s.count_source)})<br>Group: ${esc(s.group)}<br>Verified action: ${esc(s.class_label)}<br>Accredited or applicant programs: ${n(s.programs)}`);
    const tiles = { type: "scatter", mode: "text", x: S.map((s) => POS[s.state][0]), y: S.map((s) => -POS[s.state][1] - .02),
      text: S.map((s) => `<b>${s.state}</b><br>${s.count_source === "institution" ? "none" : n(s.binding_count)}`),
      textfont: { size: 10.5, color: S.map((s) => GTEXT[s.group] || "#1f2a37") }, hovertext: hover, hoverinfo: "text", customdata: S.map((s) => s.state) };
    const pick = { type: "scatter", mode: "markers", x: tiles.x, y: S.map((s) => -POS[s.state][1]), marker: { size: 26, opacity: 0, symbol: "square" }, hovertext: hover, hoverinfo: "text", customdata: tiles.customdata };
    const marks = Object.entries(CLASS_SYM).map(([c, [sym, col, line]]) => {
      const C = S.filter((s) => s.class === c);
      return { type: "scatter", mode: "markers", x: C.map((s) => POS[s.state][0] + .3), y: C.map((s) => -POS[s.state][1] + .28), hoverinfo: "skip",
        marker: { symbol: sym, size: 7, color: col, line: { color: line, width: 1.2 } } };
    });
    plot("tile-map", [tiles, pick, ...marks], { height: 380, margin: { l: 6, r: 6, t: 6, b: 6 }, shapes, hovermode: "closest",
      xaxis: { range: [-.6, 11.6], visible: false, fixedrange: true }, yaxis: { range: [-7.6, .6], visible: false, scaleanchor: "x", fixedrange: true } });
    $("tile-legend").innerHTML = `<div><b>Count a public reduced-credit degree must carry</b> ${swatches(ST.group_order.map((g) => [g === "No state or accreditor count" ? "no state or accreditor count" : g + " hours", GFILL[g]]))}</div>` +
      `<div><b>Verified action, 6 November 2026</b> <span class="lg"><span class="mk">●</span>${esc(ST.class_label.programs)}</span><span class="lg"><span class="mk">○</span>${esc(ST.class_label.rule)}</span><span class="lg"><span class="mk">△</span>${esc(ST.class_label.proposal)}</span><span class="lg">no mark: ${esc(ST.class_label.none)}</span></div>`;
    const idx = Object.fromEntries(ST.states.map((s) => [s.state, s]));
    const el = $("tile-map");
    el.removeAllListeners && el.removeAllListeners("plotly_click");
    el.on("plotly_click", (e) => { const ab = e.points[0].customdata; if (ab && idx[ab]) $("tile-card").innerHTML = stateCard(idx[ab]); });
    const first = ST.states.find((s) => s.state === "OK") || ST.states[0];
    $("tile-card").innerHTML = stateCard(first);
  }

  function claims(M) {
    const C = M.summary.holder_claims, G = M.group_order, OV = M.summary.rule_arithmetic.overlap;
    let ov = false;
    $("claims-ctrl").innerHTML = `<span class="flabel">Major hours counted as general education</span><div class="chips" id="claims-ov"><span class="chip on" data-v="0">none</span><span class="chip" data-v="${OV}">up to ${OV}</span></div>`;
    function draw() {
      const ycat = [[], []], cnt = [], part = [], cols = [], tot = [], hov = [];
      G.slice().reverse().forEach((g) => ["keep", "ansac", "acce"].forEach((h) => {
        const c = C[g], total = ov ? c[h + "_overlap"] : c[h], hp = c[h] - c.count, cp = total - hp;
        ycat[0].push(GSHORT[g]); ycat[1].push(HOLDER[h][0]); cnt.push(cp); part.push(hp); cols.push(HOLDER[h][1]); tot.push(total);
        hov.push(`<b>${esc(g)} (drawn at a count of ${n(c.count)})</b><br>${esc(HOLDER[h][0])}: ${n(hp)} hours${h !== "ansac" ? " (economics counted in both)" : ""}<br>general education still added: ${n(cp)}<br>total: ${n(total)} credits`);
      }));
      plot("claims-chart", [
        { type: "bar", orientation: "h", y: ycat, x: cnt, name: "general education count (state or system, or institutional accreditor)", marker: { color: "#E9BCD2", line: { color: "#333", width: .5 } }, hovertext: hov, hoverinfo: "text" },
        { type: "bar", orientation: "h", y: ycat, x: part, name: "the holder’s own claim", marker: { color: cols, line: { color: "#333", width: .5 } }, text: tot.map((t) => n(t)), textposition: "outside", cliponaxis: false, hovertext: hov, hoverinfo: "text" }],
      { barmode: "stack", height: 520, margin: { l: 190, r: 40, t: 10, b: 50 }, showlegend: false,
        xaxis: { range: [0, 128], title: { text: "semester hours of the degree" }, dtick: 10 }, yaxis: { automargin: true },
        shapes: [{ type: "line", x0: 90, x1: 90, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#000", width: 1.4 } }],
        annotations: [{ x: 90, yref: "paper", y: 1.01, text: "90", showarrow: false, yanchor: "bottom", font: { size: 11 } }] });
      $("claims-legend").innerHTML = swatches([["general education count (state or system, or institutional accreditor)", "#E9BCD2"], ...Object.values(HOLDER).map(([l, c]) => [l, c])]);
    }
    $("claims-ov").querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { $("claims-ov").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); ov = c.dataset.v !== "0"; draw(); }));
    draw();
  }

  /* ---------------------------------------------------------------- Routes to 90: the integer program as a tool */
  async function routes() {
    const [M, ST, R] = await Promise.all([load("model"), load("states"), load("rules")]);
    const S = M.summary, al = S.all, N = S.programs_modeled, OV = S.rule_arithmetic.overlap;
    $("routes-lede").innerHTML = `For each of the ${N} accredited or applicant programs with a usable course list, an integer program finds the smallest degree that satisfies every holder at once. Cut to ACCE’s floors, <b>${al["ACCE|floor|0|binding"].fit} of ${N}</b> fit 90; with up to ${OV} major hours counted as general education, <b>${al[`ACCE|floor|${OV}|binding`].fit}</b>; held to ACCE’s outcomes without its hour floors, <b>${S.acce_outcomes_only["0"].fit}</b>; keeping today’s courses, <b>${al["ACCE|keep|0|binding"].fit}</b>, and ${al[`ACCE|keep|${OV}|binding`].fit} with the overlap. The minimum is a lower bound, so the number that fits is an upper bound on the programs that could reach 90.`;
    tool(M, R);
    carry(M, ST);
    cover(M);
    hours(M, R);
    window.U.table("pairs-table", [{ key: "topic_a", label: "Topic", tip: "A construction topic coded from course titles by written rules." },
      { key: "topic_b", label: "Paired topic", tip: "The topic taught with it." },
      { key: "programs_one_course", label: "Programs teaching both in one course", num: true, tip: "Accredited programs whose course list carries both topics in a single course." },
      { key: "programs_separate", label: "Programs teaching them in two courses", num: true, tip: "Accredited programs that teach the two topics in separate courses." },
      { key: "credits_saved", label: "Hours saved by merging", num: true, fmt: (v) => n(v, 1), tip: "Median credits of the two separate courses less the median credits of the single course." }], M.pairs);
    $("pairs-note").textContent = `Pairs that at least five of the ${M.pairs_programs} accredited programs with course lists teach as one course (Online Resource 11). The integer program keeps courses whole, so it does not credit a merge.`;
  }

  function tool(M, R) {
    const S = M.summary, GS = M.group_summary, OO = M.outcomes_only, G = M.group_order, OV = S.rule_arithmetic.overlap;
    const st = { acc: "ACCE", ch: "floor", ov: 0, cn: "binding" };
    const Q = [["acc", "Programmatic accreditor", [["ACCE", `ACCE floors: ${R.acce.construction_min} construction and ${R.acce.business_management_min} business hours, a course for each outcome named`], ["ANSAC", "ABET ANSAC text: topics and outcomes named, no hours"], ["outcomes", "check: ACCE’s outcomes without its hour floors"]]],
      ["ch", "The program’s choice", [["floor", "cut to what the accreditor requires"], ["keep", "keep today’s construction, business, mathematics and science courses"]]],
      ["ov", "Major hours counted as general education", [[0, "none"], [OV, `up to ${OV}, as Louisiana allows`]]],
      ["cn", "General education count", [["binding", "the binding count of the state or system and the institutional accreditor"], ["core", "the institution’s own core"]]]];
    $("tool-in").innerHTML = Q.map(([k, lab, opts]) => `<div class="tq" data-q="${k}"><div class="tq-h">${esc(lab)}</div><div class="chips">${opts.map(([v, l]) => `<span class="chip" data-v="${v}">${esc(l)}</span>`).join("")}</div></div>`).join("");
    $("tool-in").querySelectorAll(".tq").forEach((d) => d.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
      const k = d.dataset.q; st[k] = k === "ov" ? Number(c.dataset.v) : c.dataset.v; draw();
    })));
    function rowsFor() {
      if (st.acc === "outcomes" && st.ch === "floor") {
        return { rows: OO.filter((r) => r.overlap === st.ov).map((r) => Object.assign({}, r, { mean_math_science: null, mean_gen_ed_added: null, rest: Math.round((r.mean_total - r.mean_construction - r.mean_business) * 10) / 10 })), outcomes: true };
      }
      const acc = st.acc === "outcomes" ? "ACCE" : st.acc;
      return { rows: GS.filter((r) => r.accreditor === acc && r.choice === st.ch && r.overlap === st.ov && r.count === st.cn) };
    }
    function draw() {
      const off = new Set();
      if (st.acc === "outcomes" && st.ch === "floor") off.add("cn");
      $("tool-in").querySelectorAll(".tq").forEach((d) => {
        d.classList.toggle("off", off.has(d.dataset.q));
        d.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", String(st[d.dataset.q]) === c.dataset.v));
      });
      const { rows, outcomes } = rowsFor();
      const all = rows.find((r) => r.group === "All");
      const notes = [];
      if (outcomes) notes.push("The check is computed at the binding count; its designs keep a course for each outcome and business topic the titles name, with no hour floor.");
      if (st.acc === "outcomes" && st.ch === "keep") notes.push("Keeping today’s courses gives the same result under any accreditor.");
      if (st.acc === "ANSAC" && st.ch === "keep") notes.push("Keeping today’s courses gives the same result under either accreditor.");
      $("tool-big").innerHTML = `<b>${all.fit_90} of ${all.programs}</b> programs fit 90 credits`;
      $("tool-sub").innerHTML = `median total ${n(all.total_median)} credits, middle half ${n(all.total_p25)} to ${n(all.total_p75)}` + (notes.length ? `<br><span class="muted">${esc(notes.join(" "))}</span>` : "");
      $("tool-groups").innerHTML = G.map((g) => { const r = rows.find((x) => x.group === g); if (!r) return ""; const ok = r.fit_90 === r.programs ? "all" : r.fit_90 === 0 ? "none" : "some";
        return `<div class="gcard ${ok}"><div class="gk">${esc(g === "No state or accreditor count" ? "no state or accreditor count" : g + " hours")}</div><div class="gv">${r.fit_90} of ${r.programs}</div><div class="muted small">median ${n(r.total_median)} credits</div></div>`; }).join("");
      // what the programs look like today and in the design, mean hours by group
      const ys = [], tr = {};
      const today = S.today;
      const parts = outcomes ? [["mean_construction", "construction courses", "#F6C89F"], ["mean_business", "business courses", "#FBE3CF"], ["rest", "mathematics, science and general education", "#E9BCD2"]] : PART;
      const TODAY = [["construction", "#F6C89F"], ["business", "#FBE3CF"], ["math_science", "#D9EAD3"], ["rest", "#FFFFFF"]];
      const traces = [];
      G.slice().reverse().forEach((g) => { ys.push(`${GSHORT[g]}: design`, `${GSHORT[g]}: today`); });
      parts.forEach(([k, lab, col]) => traces.push({ type: "bar", orientation: "h", name: lab, y: ys, marker: { color: col, line: { color: "#333", width: .5 } },
        x: ys.map((y) => { const g = G.find((gg) => y.startsWith(GSHORT[gg] + ":")); const r = rows.find((x) => x.group === g); return y.endsWith("design") && r ? r[k] : null; }),
        hovertemplate: `<b>%{y}</b><br>${lab[0].toUpperCase() + lab.slice(1)}: %{x:.1f} hours<extra></extra>` }));
      TODAY.forEach(([k, col], i) => traces.push({ type: "bar", orientation: "h", name: ["construction courses", "business courses", "mathematics and science", "general education, electives and other, as published"][i], showlegend: k === "rest", y: ys,
        marker: { color: col, line: { color: "#333", width: .5 } },
        x: ys.map((y) => { const g = G.find((gg) => y.startsWith(GSHORT[gg] + ":")); return y.endsWith("today") ? today[g][k] : null; }),
        hovertemplate: `<b>%{y}</b><br>${["construction courses", "business courses", "mathematics and science", "general education, electives and other"][i]}: %{x:.1f} hours<extra></extra>` }));
      plot("tool-shapes", traces, { barmode: "stack", height: 430, margin: { l: 130, r: 16, t: 8, b: 92 }, showlegend: true, legend: { orientation: "h", y: -.18, font: { size: 11 }, traceorder: "normal" },
        xaxis: { range: [0, 130], title: { text: "mean semester hours" }, dtick: 10 },
        shapes: [{ type: "line", x0: 90, x1: 90, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#000", width: 1.2 } }] });
    }
    draw();
  }

  function carry(M, ST) {
    const OV = M.summary.rule_arithmetic.overlap;
    const D = [["ACCE", "floor", 0, "ACCE floors", "#B45F06", "solid"], ["ACCE", "floor", OV, "ACCE floors, with the overlap", "#B45F06", "dash"],
      ["ACCE", "keep", 0, "keep today’s courses", "#2F6F8F", "solid"], ["ACCE", "keep", OV, "keep, with the overlap", "#2F6F8F", "dash"], ["ANSAC", "floor", 0, "ABET ANSAC text", "#7F7F7F", "solid"]];
    const traces = D.map(([a, c, o, lab, col, dash]) => { const R = M.carry.filter((r) => r.accreditor === a && r.choice === c && r.overlap === o);
      return { type: "scatter", mode: "lines", line: { shape: "hv", color: col, dash, width: 2.2 }, name: lab, x: R.map((r) => r.count), y: R.map((r) => 100 * r.share_fit),
        hovertemplate: `<b>${esc(lab)}</b><br>count %{x} hours: %{y:.0f}% of the programs fit 90<extra></extra>` }; });
    const bands = M.group_order.filter((g) => g !== "No state or accreditor count").map((g) => {
      const v = ST.states.filter((s) => s.group === g && s.binding_count != null).map((s) => s.binding_count);
      return { type: "rect", xref: "x", yref: "paper", x0: Math.min(...v) - .5, x1: Math.max(...v) + .5, y0: 0, y1: 1, fillcolor: GFILL[g], opacity: .55, line: { width: 0 }, layer: "below" };
    });
    const labels = M.group_order.filter((g) => g !== "No state or accreditor count").map((g) => {
      const v = ST.states.filter((s) => s.group === g && s.binding_count != null).map((s) => s.binding_count);
      return { x: (Math.min(...v) + Math.max(...v)) / 2, yref: "paper", y: 1.02, text: g, showarrow: false, yanchor: "bottom", font: { size: 10.5 } };
    });
    plot("carry-chart", traces, { height: 380, margin: { l: 60, r: 14, t: 26, b: 92 }, showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } },
      xaxis: { range: [18, 46], title: { text: "general education count the state or accreditor asks (semester hours)" } }, yaxis: { range: [0, 103], title: { text: "programs that fit 90 (%)" } },
      shapes: bands, annotations: labels });
  }

  function cover(M) {
    const F = M.families, C = M.cover;
    const rows = C.slice().reverse();
    const ylab = rows.map((r) => `${r.framework === "ACCE" ? "ACCE" : r.framework === "ANSAC topic" ? "ANSAC topic" : "ANSAC outcome"} ${r.outcome}: ${r.label}`);
    const z = rows.map((r) => [...r.families.map((v) => 100 * v), null, 100 * r.named]);
    const x = [...F, " ", "named by any title"];
    const text = rows.map((r, i) => x.map((f, j) => (j < F.length ? (r.families[j] >= .15 ? String(Math.round(100 * r.families[j])) : "") : j === F.length + 1 ? Math.round(100 * r.named) + "%" : "")));
    const hov = rows.map((r, i) => x.map((f, j) => (j < F.length ? `<b>${esc(ylab[i])}</b><br>${esc(f)}: ${Math.round(100 * r.families[j])}% of the programs keep a course of this family that names it` : j === F.length + 1 ? `<b>${esc(ylab[i])}</b><br>named by a course title in ${Math.round(100 * r.named)}% of the programs` : "")));
    plot("cover-chart", [{ type: "heatmap", x, y: ylab, z, text, texttemplate: "%{text}", textfont: { size: 9.5 }, hovertext: hov, hoverinfo: "text", xgap: 1, ygap: 1,
      colorscale: [[0, "#FFFFFF"], [.25, "#CFE6DE"], [.5, "#7DB9A7"], [.75, "#2E7D6B"], [1, "#174F42"]], zmin: 0, zmax: 100,
      colorbar: { title: { text: "% of programs", side: "right" }, thickness: 10, len: .5 } }],
    { height: 860, margin: { l: 330, r: 20, t: 130, b: 10 }, xaxis: { side: "top", tickangle: -50, fixedrange: true }, yaxis: { fixedrange: true, tickfont: { size: 10.5 } } });
  }

  function hours(M, R) {
    const H = M.hours, floor = R.acce.construction_min;
    const items = [["ACCE: construction courses that name its outcomes", H.ACCE, "#B45F06"], ["ABET ANSAC: courses that name its topics and outcomes", H.ANSAC, "#7F7F7F"], ["today: construction and business courses", H.today, "#2F6F8F"]];
    plot("hours-chart", items.map(([lab, h, col]) => ({ type: "scatter", mode: "lines+markers", y: [lab, lab, lab], x: [h.p25, h.median, h.p75], line: { color: col, width: 6 }, marker: { size: [0.1, 12, 0.1], color: col },
      hovertemplate: `<b>${esc(lab)}</b><br>median ${n(h.median)} hours, middle half ${n(h.p25)} to ${n(h.p75)} (${h.programs} programs)<extra></extra>` })),
    { height: 230, margin: { l: 330, r: 20, t: 26, b: 46 }, xaxis: { range: [0, 90], title: { text: "semester hours" } },
      shapes: [{ type: "line", x0: floor, x1: floor, yref: "paper", y0: 0, y1: 1, line: { dash: "dash", color: "#B45F06", width: 1.4 } }],
      annotations: [{ x: floor, yref: "paper", y: 1.02, text: `ACCE floor: ${floor} construction hours`, showarrow: false, yanchor: "bottom", font: { size: 11, color: "#B45F06" } }] });
  }

  return { holders, routes };
})();
