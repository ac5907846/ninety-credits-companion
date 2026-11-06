/* The rewritten article on the site (6 November 2026, late evening): its tables as the article prints them, the dated
   actions spelled out as in Figure 1, where the balance turns (Figure 2), and the decision tree (Figure 3) as a tool. */
window.Paper = (function () {
  const { load, $, esc, n, money, share, plot } = window.U;
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WHO = { program: ["program faculty", "#D4EBF2"], institution: ["institution", "#D9EAD3"], state: ["state, system or regional accreditor", "#EAD1DC"], accreditor: ["programmatic accreditor", "#FCE5CD"] };
  const SRC = [["general education to the count", "general education cut to the count", "#E5A0BA"],
    ["general education taught inside the major", "general education taught inside major courses", "#F7DEE8"],
    ["professional courses cut", "professional courses cut", "#A23B3E"], ["merges", "two courses merged into one", "#5B9BD5"],
    ["tool courses folded", "tool course folded into the courses that use it", "#BDD7EE"], ["free electives and orientation", "free electives and orientation", "#C8C8C8"]];
  const who = (k) => `<span class="who" style="background:${WHO[k][1]}">${esc(WHO[k][0])}</span>`;

  /* a table of the article: the first row is the header; a row with text only in its first cell is a group heading */
  function paperTable(prefix, T) {
    const t = $(prefix + "-table");
    if (!T || !t) return;
    const head = T.rows[0];
    if ($(prefix + "-title")) $(prefix + "-title").textContent = T.title;
    t.innerHTML = `<thead><tr>${head.map((h) => `<th>${md(h)}</th>`).join("")}</tr></thead><tbody>` + T.rows.slice(1).map((r) => {
      const group = r.slice(1).every((c) => c === "");
      return group ? `<tr class="group"><td colspan="${head.length}">${md(r[0])}</td></tr>` : `<tr>${r.map((c) => `<td>${md(c)}</td>`).join("")}</tr>`;
    }).join("") + "</tbody>";
    if ($(prefix + "-note")) $(prefix + "-note").innerHTML = md((T.notes || []).join(" "));
  }

  /* ---------------------------------------------------------------- US Atlas: the door, and the dated actions */
  async function atlas() {
    const [PA, TL] = await Promise.all([load("paper"), load("timeline")]);
    paperTable("door", PA.tables.door);
    const LV = { federal: ["★", "☆", "federal", "star"], accreditor: ["■", "□", "accreditor", "square"], system: ["◆", "◇", "university system", "diamond"], state: ["●", "○", "state", "circle"] };
    const fmt = (d) => { const [y, m, dd] = d.split("-").map(Number); return dd === 1 ? `${MON[m - 1]} ${y}` : `${dd} ${MON[m - 1]} ${y}`; };
    const pick = new Set();
    let namedOnly = false;
    $("tl-filter").innerHTML = Object.entries(LV).map(([k, v]) => `<span class="chip" data-k="${k}">${v[0]} ${esc(v[2])}</span>`).join("") +
      `<span class="chip" data-k="named">● names a construction program</span>`;
    $("tl-filter").querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
      const k = c.dataset.k;
      if (k === "named") namedOnly = !namedOnly; else if (pick.has(k)) pick.delete(k); else pick.add(k);
      c.classList.toggle("on");
      draw();
    }));
    function draw() {
      const E = TL.events.filter((e) => (!pick.size || pick.has(e.level)) && (!namedOnly || e.construction_named));
      const order = ["state", "system", "accreditor", "federal"];
      plot("tl-chart", order.map((lv) => {
        const R = E.filter((e) => e.level === lv);
        return { type: "scatter", mode: "markers", name: LV[lv][2], x: R.map((e) => e.date), y: R.map(() => LV[lv][2]),
          marker: { symbol: LV[lv][3], size: lv === "federal" ? 15 : 11, color: R.map((e) => (e.construction_named ? "#222" : "white")), line: { color: "#222", width: 1.2 } },
          customdata: R.map((e) => `<b>${esc(fmt(e.date))}</b><br>${esc(e.actor)}: ${esc(e.action)}`), hovertemplate: "%{customdata}<extra></extra>" };
      }), { height: 200, margin: { l: 120, r: 14, t: 6, b: 30 }, xaxis: { type: "date", range: ["2024-02-01", "2026-11-30"] }, yaxis: { categoryorder: "array", categoryarray: order.map((x) => LV[x][2]) } });
      let year = null;
      $("timeline").innerHTML = E.map((e) => {
        const y = e.date.slice(0, 4);
        const head = y !== year ? `<li class="tl-year">${y}</li>` : "";
        year = y;
        const src = /^https?:/.test(e.source) ? ` <a href="${esc(e.source)}" target="_blank" rel="noopener">source</a>` : "";
        return head + `<li><span class="tl-date">${esc(fmt(e.date))}</span><span class="tl-mark" title="${esc(LV[e.level][2])}">${e.construction_named ? LV[e.level][0] : LV[e.level][1]}</span>` +
          `<span><b>${esc(e.actor)}:</b> ${esc(e.action)}${e.state ? ` <span class="muted">(${esc(e.state)})</span>` : ""}${src}</span></li>`;
      }).join("");
    }
    draw();
  }

  /* ---------------------------------------------------------------- What holds 120 */
  async function rules() {
    const PA = await load("paper");
    paperTable("holds", PA.tables.holds);
  }

  /* ---------------------------------------------------------------- Gains and losses: where the balance turns */
  async function ledger() {
    const [PA, B] = await Promise.all([load("paper"), load("balance")]);
    paperTable("gains", PA.tables.gains);
    const c3 = B.curves.filter((r) => r.rate === 0.03), c5 = B.curves.filter((r) => r.rate === 0.05);
    const H = c3.map((r) => r.horizon);
    const lv = B.summary.level_threshold;
    plot("bal-student", [
      { type: "scatter", mode: "lines", x: H, y: c3.map((r) => 100 * r.p75), line: { width: 0 }, hoverinfo: "skip", showlegend: false },
      { type: "scatter", mode: "lines", x: H, y: c3.map((r) => 100 * r.p25), fill: "tonexty", fillcolor: "rgba(31,111,92,.22)", line: { width: 0 }, name: "middle half of the programs", hoverinfo: "skip" },
      { type: "scatter", mode: "lines", x: H, y: c3.map((r) => 100 * r.median), line: { color: "#1F6F5C", width: 2.6 }, name: `median of ${c3[0].programs} programs, 3% a year`,
        hovertemplate: "Over %{x} years: pay %{y:.1f}% lower every year would cancel the gain<extra></extra>" },
      { type: "scatter", mode: "lines", x: c5.map((r) => r.horizon), y: c5.map((r) => 100 * r.median), line: { color: "#555", width: 1.4, dash: "dash" }, name: "median at 5% a year",
        hovertemplate: "At 5% a year, over %{x} years: %{y:.1f}%<extra></extra>" },
      { type: "scatter", mode: "markers+text", x: [10, 20, 40], y: [lv.h10.median, lv.h20.median, lv.h40.median].map((v) => 100 * v), text: [lv.h10.median, lv.h20.median, lv.h40.median].map((v) => share(v, 1)),
        textposition: ["top right", "bottom center", "bottom left"], marker: { color: "#1F6F5C", size: 8 }, showlegend: false, hoverinfo: "skip" }],
    { showlegend: true, legend: { orientation: "h", y: -.28, font: { size: 11 } }, margin: { l: 56, r: 14, t: 10, b: 84 }, height: 340,
      xaxis: { title: { text: "years the pay penalty lasts" }, range: [3, 40] }, yaxis: { title: { text: "pay penalty, % of pay each year" }, range: [0, 25] },
      annotations: [{ x: 39, y: 21, text: "a 90-credit degree costs the student<br>more than it gives", showarrow: false, xanchor: "right", font: { size: 11.5 } },
        { x: 4, y: 1.5, text: "it pays", showarrow: false, xanchor: "left", font: { size: 11.5 } }] });
    const C = B.institution_curve, be = B.summary.institution_break_even;
    plot("bal-inst", [
      { type: "scatter", mode: "lines", x: C.map((r) => 100 * r.new_share), y: C.map((r) => r.p75), line: { width: 0 }, hoverinfo: "skip", showlegend: false },
      { type: "scatter", mode: "lines", x: C.map((r) => 100 * r.new_share), y: C.map((r) => r.p25), fill: "tonexty", fillcolor: "rgba(31,111,92,.22)", line: { width: 0 }, name: "middle half of the programs", hoverinfo: "skip" },
      { type: "scatter", mode: "lines", x: C.map((r) => 100 * r.new_share), y: C.map((r) => r.median), line: { color: "#1F6F5C", width: 2.6 }, name: `median of ${be.programs} programs`,
        hovertemplate: "%{x}% of students new: %{y:$,.0f} per 90-credit student<extra></extra>" },
      { type: "scatter", mode: "markers", x: [100 * be.median], y: [0], marker: { color: "#1F6F5C", size: 10 }, showlegend: false, hovertemplate: `breaks even at ${share(be.median)}<extra></extra>` }],
    { showlegend: true, legend: { orientation: "h", y: -.28, font: { size: 11 } }, margin: { l: 66, r: 14, t: 10, b: 84 }, height: 340,
      xaxis: { title: { text: "students who would not otherwise have enrolled (%)" }, range: [0, 60] }, yaxis: { title: { text: "net per 90-credit student" }, tickformat: "$,.0f", zeroline: true, zerolinecolor: "#555" },
      annotations: [{ x: 100 * be.median, y: 0, ax: -60, ay: -70, text: `breaks even when ${share(be.median)} of<br>its students are new: r / (90 + r)`, showarrow: true, arrowwidth: .8, font: { size: 11 } },
        { x: 59, y: 1500, text: "the program gains", showarrow: false, xanchor: "right", font: { size: 11.5 } },
        { x: 59, y: -1500, text: "the program loses", showarrow: false, xanchor: "right", font: { size: 11.5 } }] });
    // the institution's own case
    const P = B.institution_programs.rows.map((r) => Object.fromEntries(B.institution_programs.columns.map((c, i) => [c, r[i]]))).sort((a, b) => a.institution.localeCompare(b.institution));
    $("inst-in").innerHTML = `<label><span>Program</span><select id="inst-prog" style="grid-column: span 2"><option value="">median of the ${P.length} programs</option>${P.map((p, i) => `<option value="${i}">${esc(p.institution)}, ${esc(p.program)}</option>`).join("")}</select></label>` +
      `<label><span>Students who would not otherwise have enrolled</span><input type="range" id="inst-x" min="0" max="60" step="1" value="10"><span class="val" id="inst-xv">10%</span></label>`;
    function calc() {
      const x = Number($("inst-x").value) / 100;
      $("inst-xv").textContent = Math.round(100 * x) + "%";
      const i = $("inst-prog").value;
      if (i === "") {
        const r = C.reduce((a, b) => (Math.abs(b.new_share - x) < Math.abs(a.new_share - x) ? b : a));
        $("inst-out").innerHTML = `${r.median < 0 ? "−" : ""}${money(Math.abs(r.median))} per 90-credit student`;
        $("inst-note").innerHTML = `Median of ${be.programs} programs with ${Math.round(100 * x)}% of the students new to the institution. The ${be.programs_losing} programs that lose money break even when ${share(be.min)} to ${share(be.max)} of the students are new, r / (90 + r) for r credits removed.`;
        return;
      }
      const p = P[Number(i)], m = p.net_margin_per_credit, r = p.credits_removed;
      const net = m * (x * 90 - (1 - x) * r);
      $("inst-out").innerHTML = `${net < 0 ? "−" : ""}${money(Math.abs(net))} per 90-credit student`;
      $("inst-note").innerHTML = m > 0
        ? `${esc(p.institution)} removes ${n(r)} credits and loses ${money(Math.abs(p.net_per_graduate))} on each student who would have taken the 120-credit degree; it breaks even when ${share(r / (90 + r))} of the students are new, ${n(r)} / (90 + ${n(r)}).`
        : `${esc(p.institution)} saves money on each student who would have taken the longer degree (its instruction costs more than it collects per credit), so new students add to the cost rather than cover it.`;
    }
    $("inst-prog").addEventListener("change", calc);
    $("inst-x").addEventListener("input", calc);
    calc();
  }

  /* ---------------------------------------------------------------- Routes to 90: the decision tree as a tool */
  async function routes() {
    const [PA, T] = await Promise.all([load("paper"), load("tree")]);
    paperTable("routes", PA.tables.routes);
    const Q = [
      { k: "acc", who: "program", q: "Which accreditation does the 90-credit degree keep?", opts: [["acce", "ACCE: 50 construction and 12 business hours"], ["text", "ABET ANSAC, held to its text"], ["practice", "ABET ANSAC, held to practice"], ["none", "none"]] },
      { k: "who", who: "program", q: "Who enters the 90-credit degree?", opts: [["first", "a first-year entrant"], ["transfer", "a transfer student with a 60-credit associate degree"]] },
      { k: "ov", who: "state", q: "May up to 12 major hours count as general education?", opts: [["yes", "yes, as Louisiana allows"], ["no", "no"]] },
      { k: "count", who: "institution", q: "Which general education count must the degree keep?", opts: [["binding", "the binding regional or state count"], ["core", "the institution’s own core"]] },
      { k: "earth", who: "program", q: "Earth and soil science courses, where the program requires them?", opts: [["keep", "keep them"], ["drop", "drop them"]] },
      { k: "order", who: "program", q: "To stop at exactly 90, which goes first?", opts: [["ge", "general education"], ["prof", "professional courses"]] },
      { k: "method", who: "program", q: "Merge and fold first, or cut whole courses?", opts: [["merge", "merge and fold"], ["cut", "cut whole courses"]] }];
    const S = { acc: "acce", who: "first", ov: "yes", count: "binding", earth: "keep", order: "ge", method: "merge" };
    $("tree-in").innerHTML = Q.map((q) => `<div class="tq" data-q="${q.k}"><div class="tq-h">${who(q.who)}${esc(q.q)}</div><div class="chips">${q.opts.map(([v, lab]) => `<span class="chip" data-v="${v}">${esc(lab)}</span>`).join("")}</div></div>`).join("");
    $("tree-in").querySelectorAll(".tq").forEach((d) => d.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { S[d.dataset.q] = c.dataset.v; draw(); })));
    const tr = T.transfer;
    function totals() {
      const A = T.acce, N = T.ansac;
      if (S.acc === "acce") {
        const e = S.earth === "drop" ? "_earth_cut" : "";
        const key = S.ov === "yes" ? `overlap_${S.count}${e}` : (S.count === "core" ? `no_overlap_core${e}` : `no_overlap${e}`);
        return A[key];
      }
      if (S.acc === "text") return S.ov === "yes" ? N.text_overlap : N.text_no_overlap;
      if (S.acc === "practice") return S.ov === "yes" ? N.practice_overlap : N.practice_no_overlap;
      return null;
    }
    function draw() {
      const off = new Set();
      if (S.acc === "none" || S.who === "transfer") ["ov", "count", "earth", "order", "method"].forEach((k) => off.add(k));
      else if (S.acc !== "acce") ["count", "earth", "order", "method"].forEach((k) => off.add(k));
      const tot = off.has("ov") ? null : totals();
      const exact = S.acc === "acce" && S.who === "first" && S.ov === "yes" && S.count === "binding" && S.earth === "keep";
      if (!exact) ["order", "method"].forEach((k) => off.add(k));
      $("tree-in").querySelectorAll(".tq").forEach((d) => {
        d.classList.toggle("off", off.has(d.dataset.q));
        d.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", S[d.dataset.q] === c.dataset.v));
      });
      if (S.acc === "none") {
        $("tree-msg").innerHTML = "Outside ACCE and ABET there is no professional floor, but general education still binds, and graduates lose the 48-month route to the Certified Construction Manager credential, which needs an accredited degree.";
        $("tree-out").innerHTML = "";
        return;
      }
      if (S.who === "transfer") {
        $("tree-msg").innerHTML = `General education comes with the associate degree, so ACCE’s ${tr.acce_professional_hours} professional hours bind: ${tr.university_credits_left} university credits leave at least <b>${tr.professional_hours_needed_in_associate}</b> of them to the associate degree. ${tr.acce_accredited_associate_programs} ACCE-accredited associate programs exist, in ${tr.states_with_acce_associate} states.`;
        $("tree-out").innerHTML = "";
        return;
      }
      if (!tot) { $("tree-msg").textContent = "This combination is not computed."; $("tree-out").innerHTML = ""; return; }
      const reach = T.codes.filter((c) => tot[c] <= 90).length;
      const key = `${S.order === "ge" ? "general education first" : "professional first"}|${S.method === "merge" ? "redesign first" : "cut only"}`;
      const Bt = exact ? T.bottom[key] : null;
      $("tree-msg").innerHTML = `<b>${reach} of 5</b> programs reach 90 under these choices.` + (Bt ? ` To stop at exactly 90 they take <b>${n(Bt.professional_total, 1)}</b> of their ${n(Bt.total_hours)} hours from professional courses.` : "");
      $("tree-out").innerHTML = T.codes.map((c) => {
        const v = tot[c], ok = v <= 90;
        let bar = "";
        if (Bt) {
          const pr = Bt.programs[c];
          bar = `<div class="tbar">${SRC.map(([s, lab, col]) => (pr[s] > 0 ? `<span style="width:${(100 * pr[s]) / 30}%;background:${col}" title="${esc(lab)}: ${n(pr[s], 1)} hours"></span>` : "")).join("")}</div>` +
            `<div class="muted small">professional hours cut: <b style="color:${Bt.professional_hours[c] > 0 ? "#A23B3E" : "inherit"}">${n(Bt.professional_hours[c], 1)}</b></div>`;
        }
        return `<div class="tcard ${ok ? "ok" : ""}"><div class="tname"><b>${c}</b> ${esc(T.names[c])}</div><div class="tot">${n(v, 1)}</div><div class="muted small">${ok ? "credits: reaches 90" : "credits: stays above 90"}</div>${bar}</div>`;
      }).join("");
    }
    $("tree-legend").innerHTML = SRC.map(([, lab, col]) => `<span class="lg"><span class="sw" style="background:${col}"></span>${esc(lab)}</span>`).join("");
    draw();
  }

  /* ---------------------------------------------------------------- AI */
  async function ai() {
    const PA = await load("paper");
    paperTable("aitab", PA.tables.ai_table);
  }

  return { atlas, rules, ledger, routes, ai, paperTable, md };
})();
