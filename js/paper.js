/* The article on the site (rewritten 6 November 2026, night): its tables as the article prints them, the verified state
   actions, and where the balance turns. No program is named outside the atlases. */
window.Paper = (function () {
  const { load, $, esc, n, money, share, median, plot, table } = window.U;
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = (d) => { if (!d) return ""; const [y, m, dd] = d.split("-").map(Number); return dd === 1 ? `${MON[m - 1]} ${y}` : `${dd} ${MON[m - 1]} ${y}`; };

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

  /* ---------------------------------------------------------------- US Atlas: Table 1 and the verified state actions */
  async function atlas() {
    const [PA, ST] = await Promise.all([load("paper"), load("states")]);
    paperTable("door", PA.tables.door);
    const order = { programs: 0, rule: 1, proposal: 2, none: 3 };
    const S = ST.states.filter((s) => s.class !== "none").sort((a, b) => order[a.class] - order[b.class] || (b.date || "").localeCompare(a.date || ""));
    table("actions-table", [{ key: "name", label: "State", tip: "The District of Columbia is counted as a state." },
      { key: "class_label", label: "Verified action", tip: "The strongest action found and checked against primary documents and news reports on 6 November 2026 (Online Resource 1 of the article)." },
      { key: "action", label: "What it is" }, { key: "date", label: "Date", fmt: (v) => esc(day(v)) },
      { key: "construction_named", label: "Construction named", fmt: (v) => (v ? "yes, in a proposal or statement" : "no") }], S, { sortKey: null });
    const none = ST.states.filter((s) => s.class === "none").map((s) => s.name);
    $("actions-note").textContent = `No action was found in ${none.length} states: ${none.join(", ")}. No approved reduced-credit program is in construction.`;
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
    // the break-even for a program that removes r credits, at the median net margin per credit of the programs that lose money
    const P = B.institution_programs.rows.map((r) => Object.fromEntries(B.institution_programs.columns.map((c, i) => [c, r[i]])));
    const losing = P.filter((p) => p.net_margin_per_credit > 0);
    const m = median(losing.map((p) => p.net_margin_per_credit));
    const rs = losing.map((p) => p.credits_removed).filter((v) => v != null);
    const rmin = Math.min(...rs), rmax = Math.max(...rs);
    $("inst-in").innerHTML = `<label><span>Credits removed, r</span><input type="range" id="inst-r" min="${rmin}" max="${rmax}" step="1" value="${rmin}"><span class="val" id="inst-rv"></span></label>` +
      `<label><span>Students who would not otherwise have enrolled</span><input type="range" id="inst-x" min="0" max="60" step="1" value="10"><span class="val" id="inst-xv">10%</span></label>`;
    function calc() {
      const x = Number($("inst-x").value) / 100, r = Number($("inst-r").value);
      $("inst-xv").textContent = Math.round(100 * x) + "%";
      $("inst-rv").textContent = r;
      const net = m * (x * 90 - (1 - x) * r);
      $("inst-out").innerHTML = `${net < 0 ? "−" : ""}${money(Math.abs(net))} per 90-credit student`;
      $("inst-note").innerHTML = `At the median net margin of ${money(m)} per credit of the ${losing.length} programs that lose money, a program that removes ${n(r)} credits breaks even when ${share(r / (90 + r))} of its students are new, ${n(r)} / (90 + ${n(r)}), whatever the margin. Programs remove ${n(rmin)} to ${n(rmax)} credits.`;
    }
    $("inst-r").addEventListener("input", calc);
    $("inst-x").addEventListener("input", calc);
    calc();
  }

  /* ---------------------------------------------------------------- AI and Compare: the article’s Tables 4 and 5 */
  async function ai() {
    const PA = await load("paper");
    paperTable("aitab", PA.tables.ai_table);
  }
  async function compare() {
    const PA = await load("paper");
    paperTable("ctx", PA.tables.before_after);
  }

  return { atlas, ledger, ai, compare, paperTable, md };
})();
