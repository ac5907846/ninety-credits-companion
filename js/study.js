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

  /* ---------------------------------------------------------------- about: references, data sources, data files */
  async function about() {
    const D = await load("sources");
    $("refs-list").innerHTML = D.references.map((r) => `<li>${md(r.apa).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u.replace(/\.$/, "")}" target="_blank" rel="noopener">${u}</a>`)}</li>`).join("");
    window.U.table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Read or released" },
      { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }],
      D.data.filter((d) => !/Figure S2/.test(d.what)));   // the source of a figure this site no longer shows
    const files = ["study", "atlas", "courses", "states", "rq1", "uk", "hk"].concat(window.App && window.App.australia ? ["au"] : []).concat(["jobs", "jobs_fingerprints", "sources"]);
    $("files-list").innerHTML = files.map((f) => `<li><a href="data/${f}.json" target="_blank">data/${f}.json</a></li>`).join("");
  }

  return { requirements, about };
})();
