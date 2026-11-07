/* Pathways to a 90-credit degree (decision 34): course groups and their merges, the pathways tree, the typical program,
   AI by course group and outcome, and the geography of the state counts. Every number is read from data/paths.json,
   data/model.json and data/rules.json; no program is named and no program id or course code is shown. */
window.Paths = (function () {
  const { load, $, esc, n, share, dec, plot } = window.U;
  const of = (a, b) => (a === 0 ? `none of ${b}` : `${a} of ${b}`);
  const PART_FILL = { "general education": "#E9BCD2", business: "#FBE3CF", construction: "#F6C89F" };
  const PART_BAND = { "general education": "#F2D6E4", business: "#FCEBDD", construction: "#F9DEC4" };
  const ARC = { con: ["#8C5A2B", ""], gen: ["#B3478A", ""], proposal: ["#B3478A", "4 3"], blocked: ["#C0504D", "5 3"] };
  const ramp = (v) => { if (v == null) return "transparent"; const a = [245, 250, 253], b = [198, 219, 239], c = [107, 174, 214];
    const t = Math.max(0, Math.min(1, v)), [p, q, s] = t < .5 ? [a, b, t / .5] : [b, c, (t - .5) / .5];
    return `rgb(${p.map((x, i) => Math.round(x + (q[i] - x) * s)).join(",")})`; };
  const GLABEL = { "30 or fewer": "30 or fewer hours", "31 to 36": "31 to 36 hours", "37 to 40": "37 to 40 hours", "41 to 43": "41 to 43 hours", "No state or accreditor count": "no state or accreditor count" };

  /* ---------------------------------------------------------------- course groups and their merges */
  function groupsMap(P, R) {
    const G = P.groups, L = P.links, byMerge = Object.fromEntries(L.map((l) => [l.merge, l]));
    const max = Math.ceil(Math.max(...G.map((g) => g.mean_today)) + 1);
    const bar = (g) => { const W = 150, s = (v) => (W * v) / max;
      const kept = (v, sym) => (v == null ? "" : sym === "d" ? `<path d="M${s(v)},3 L${s(v) + 4},8 L${s(v)},13 L${s(v) - 4},8 Z" fill="#222"/>` : `<circle cx="${s(v)}" cy="8" r="4" fill="white" stroke="#222" stroke-width="1.2"/>`);
      return `<svg class="cg-bar" width="${W + 8}" height="16"><rect x="0" y="3" width="${s(g.mean_today)}" height="10" fill="${PART_FILL[g.part]}" stroke="#333" stroke-width=".5"/>${g.mean_floor > 0 ? kept(g.mean_floor, "d") : ""}${g.mean_merged_overlap > 0 ? kept(g.mean_merged_overlap, "c") : ""}</svg>`; };
    const dot = (on, ring) => (on ? `<span class="cg-dot on"></span>` : ring ? `<span class="cg-dot ring" data-tip="Serves general education only where an overlap rule lets a construction course count toward it."></span>` : `<span class="cg-dot"></span>`);
    const tipOf = (g) => `${g.group}: carried by ${g.programs_with} of ${P.summary.programs} programs (${share(g.share_programs)}), a median ${n(g.median_where_present, 1)} hours where present. Mean hours today ${n(g.mean_today, 1)}; kept at ACCE’s floors ${n(g.mean_floor, 1)}; kept with every topic merged and the overlap ${n(g.mean_merged_overlap, 1)}.` +
      (g.ai_exposure != null ? ` AI exposure of the work it trains ${dec(g.ai_exposure)}.` : "") + (g.slos.length ? ` ACCE outcomes named: ${g.slos.join(", ")}.` : "");
    let html = `<thead><tr><th class="cg-arcs-h">Merges between course groups</th><th>Course group</th><th class="c">Merged inside the group (programs)</th><th>Mean hours today across ${P.summary.programs} programs <span class="muted">(◆ kept at ACCE’s floors, ○ kept with every topic merged and the overlap)</span></th><th class="c">State general education</th><th class="c">ACCE business, ${R.acce.business_management_min} hours</th><th class="c">ACCE construction, ${R.acce.construction_min} hours</th><th class="c">ACCE outcomes named</th><th class="c">AI exposure</th></tr></thead><tbody>`;
    ["general education", "business", "construction"].forEach((part) => {
      html += `<tr class="cg-band"><td></td><td colspan="8" style="background:${PART_BAND[part]}"><b>${part[0].toUpperCase() + part.slice(1)}</b></td></tr>`;
      G.filter((g) => g.part === part).forEach((g) => {
        const loops = g.loops.map((lp) => { const l = byMerge[lp.merge] || {}; return `<span class="cg-loop" data-tip="${esc(`${lp.merge}: ${lp.one_course} programs teach the two as one course, ${lp.separate} as two; ${l.rule || ""}. AI role: ${l.ai_role || ""}`)}">${lp.one_course}</span>`; }).join(" ");
        html += `<tr class="cg-row" data-g="${esc(g.group)}" data-tip="${esc(tipOf(g))}"><td class="cg-arcs-c"></td><td>${esc(g.group)}</td><td class="c">${loops}</td><td>${bar(g)}</td><td class="c">${dot(g.gen, g.gen_overlap)}</td><td class="c">${dot(g.bus)}</td><td class="c">${dot(g.con)}</td><td class="c small">${g.slos.join(", ")}</td><td class="c">${g.ai_exposure != null ? `<span class="cg-ai" style="background:${ramp(g.ai_exposure)}">${dec(g.ai_exposure)}</span>` : ""}</td></tr>`;
      });
    });
    $("cg-table").innerHTML = html + "</tbody>";
    function arcs() {
      const box = $("cg-wrap"), svg = $("cg-svg"), tb = $("cg-table");
      if (!box || box.offsetParent === null) return;
      const top = box.getBoundingClientRect().top, rows = {};
      tb.querySelectorAll("tr.cg-row").forEach((r) => { const b = r.getBoundingClientRect(); rows[r.dataset.g] = b.top - top + b.height / 2; });
      const col = tb.querySelector("th.cg-arcs-h").getBoundingClientRect(), x0 = col.right - box.getBoundingClientRect().left - 4, W = col.width;
      svg.setAttribute("width", Math.round(x0 + 6)); svg.setAttribute("height", Math.round(tb.getBoundingClientRect().height));
      const cross = L.filter((l) => l.style !== "loop" && rows[l.a] != null && rows[l.b] != null);
      const nmax = Math.max(...cross.map((l) => l.one_course || 0));
      svg.innerHTML = cross.map((l, i) => {
        const ya = rows[l.a], yb = rows[l.b], span = Math.abs(yb - ya), d = Math.min(W - 18, 22 + span * .17 + (i % 3) * 6);
        const [colr, dash] = ARC[l.style], w = l.style === "blocked" ? 1.2 : 1 + 4 * ((l.one_course || 0) / nmax);
        const path = `M${x0},${ya} C${x0 - d},${ya} ${x0 - d},${yb} ${x0},${yb}`;
        const lab = l.style === "blocked" ? `× ${l.separate}` : String(l.one_course);
        const tip = l.style === "blocked" ? `${l.merge}: blocked by ACCE 3.2.1 and 3.2.2 (${l.rule}); ${l.separate} programs carry both courses. AI role: ${l.ai_role}`
          : `${l.merge} (${l.kind}): ${l.one_course} programs teach it as one course, ${l.separate} apart; ${l.rule}. AI role: ${l.ai_role}` + (l.style === "proposal" ? ` Fewer than ${P.practice_min} programs practice it: a proposal.` : "");
        return `<g data-tip="${esc(tip)}"><path d="${path}" fill="none" stroke="transparent" stroke-width="10"/><path d="${path}" fill="none" stroke="${colr}" stroke-width="${w.toFixed(1)}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>` +
          `<text x="${x0 - d * .75}" y="${(ya + yb) / 2}" font-size="11" text-anchor="middle" fill="${colr}">${lab}</text></g>`;
      }).join("");
    }
    arcs();
    window.addEventListener("resize", () => { clearTimeout(arcs.t); arcs.t = setTimeout(arcs, 120); });
    groupsMap.arcs = arcs;
    $("cg-legend").innerHTML = `<span class="lg"><svg width="26" height="10"><path d="M0,5 L26,5" stroke="${ARC.con[0]}" stroke-width="2.5"/></svg>two construction groups taught as one course</span>` +
      `<span class="lg"><svg width="26" height="10"><path d="M0,5 L26,5" stroke="${ARC.gen[0]}" stroke-width="2.5"/></svg>general education taught inside a construction course, counted only where an overlap rule allows</span>` +
      `<span class="lg"><svg width="26" height="10"><path d="M0,5 L26,5" stroke="${ARC.proposal[0]}" stroke-width="1.5" stroke-dasharray="4 3"/></svg>a proposal: fewer than ${P.practice_min} programs</span>` +
      `<span class="lg"><svg width="26" height="10"><path d="M0,5 L26,5" stroke="${ARC.blocked[0]}" stroke-width="1.5" stroke-dasharray="5 3"/></svg>blocked by ACCE 3.2.1 and 3.2.2 (× programs that carry both courses)</span>` +
      `<span class="lg"><span class="cg-loop">n</span>two topics inside one group taught as one course, by n programs</span>`;
  }

  /* ---------------------------------------------------------------- geography: where a 90-credit degree would matter most */
  function geography(P) {
    const Gx = P.geography.slice().reverse(), S = P.summary.geography, sl = P.summary.state_line_effect;
    plot("geo-chart", [
      { type: "bar", orientation: "h", name: "construction bachelor’s degrees, 2024", y: Gx.map((g) => GLABEL[g.group]), x: Gx.map((g) => 100 * g.share_graduates), marker: { color: "#D4EBF2", line: { color: "#333", width: .5 } },
        hovertemplate: "<b>%{y}</b><br>%{x:.0f}% of the construction bachelor’s degrees of 2024<extra></extra>" },
      { type: "bar", orientation: "h", name: "construction manager jobs, May 2025", y: Gx.map((g) => GLABEL[g.group]), x: Gx.map((g) => 100 * g.share_jobs), marker: { color: "#F6C89F", line: { color: "#333", width: .5 } },
        hovertemplate: "<b>%{y}</b><br>%{x:.0f}% of construction manager jobs (BLS OES, May 2025)<extra></extra>" }],
    { barmode: "group", height: 330, margin: { l: 180, r: 16, t: 8, b: 70 }, showlegend: true, legend: { orientation: "h", y: -.22, font: { size: 11 } }, xaxis: { title: { text: "share of the United States (%)" }, rangemode: "tozero" } });
    $("geo-table").innerHTML = `<thead><tr><th>Group of states</th><th>States</th><th class="n">Programs</th><th class="n">Degrees, 2024</th><th class="n">Jobs, 2025</th><th class="n">Fit 90 at ACCE’s floors</th><th class="n">With the overlap</th></tr></thead><tbody>` +
      P.geography.map((g) => `<tr><td>${esc(GLABEL[g.group])}</td><td class="small">${esc(g.states.join(", "))}</td><td class="n">${g.programs}</td><td class="n">${share(g.share_graduates)}</td><td class="n">${share(g.share_jobs)}</td><td class="n">${of(g.fit_floor, g.modeled)}</td><td class="n">${of(g.fit_floor_overlap, g.modeled)}</td></tr>`).join("") + "</tbody>";
    $("geo-note").textContent = `The states that count 37 to 43 hours of general education hold ${share(S.high_count_share_jobs)} of construction manager jobs and ${share(S.high_count_share_graduates)} of the degrees. At ACCE’s floors the typical program comes to ${sl.typical_floor} credits at a count of ${sl.typical_count} and ${sl.typical_floor_at_highest} at ${sl.highest_count}: the state line adds ${sl.credits_added_by_the_state_line} credits, against the ${sl.credits_saved_by_merging} its merges save. Programs: accredited or applicant; fit among the modeled programs.`;
  }

  /* ---------------------------------------------------------------- the pathways tree */
  function tree(P, M, R) {
    const S14 = M.summary, S15 = P.summary, N = S15.programs, rows = P.programs.rows, K = P.programs.keys, OV = S14.rule_arithmetic.overlap;
    const fg = (g, ov) => S14.fit_by_group[`${g}|ACCE|floor|${ov}`], hc = S14.high_count_groups;
    const ki = (k) => K.indexOf(k) + 1;
    const NODES = {
      root: { t: `${N} accredited or applicant programs`, s: `today: a mean ${n(S14.today.All.total, 1)} credits`, cls: "gray", key: null },
      keepall: { t: "Keep every topic it teaches", s: "each major course stays, as it is or merged", cls: "blue", key: null },
      today: { t: "As today", s: "courses as they are", fit: S15.keep["0"].fit, med: S15.keep["0"].median, cls: "blue", key: "keep_0" },
      merge: { t: "Merge course pairs", s: "the field teaches as one", fit: S15.keep_merge["0"].fit, med: S15.keep_merge["0"].median, cls: "blue", key: "merge_0" },
      today12: { t: "With the overlap", s: `${OV} major hours count as general education`, fit: S15.keep["12"].fit, med: S15.keep["12"].median, cls: "blue", key: "keep_12" },
      merge12: { t: "With the overlap", s: `merged, and ${OV} major hours count as general education`, fit: S15.keep_merge["12"].fit, med: S15.keep_merge["12"].median, cls: "blue strong", key: "merge_12" },
      floor: { t: "Cut to ACCE’s floors", s: `${R.acce.construction_min} construction and ${R.acce.business_management_min} business hours, a course for each outcome named`, fit: S14.all["ACCE|floor|0|binding"].fit, med: S14.all["ACCE|floor|0|binding"].median, cls: "peach", key: "floor_0" },
      ansac: { t: "ABET ANSAC’s text", s: "no hours; courses that name its topics and outcomes", fit: S14.all["ANSAC|floor|0|binding"].fit, med: S14.all["ANSAC|floor|0|binding"].median, cls: "peachl dashed", key: "ansac_0" },
      g30: { t: "30 or fewer", s: "semester hours", fit: fg("30 or fewer", 0).fit, of: fg("30 or fewer", 0).programs, med: fg("30 or fewer", 0).median, cls: "pink strong", key: "floor_0", groups: [0] },
      g36: { t: "31 to 36", s: "semester hours", fit: fg("31 to 36", 0).fit, of: fg("31 to 36", 0).programs, med: fg("31 to 36", 0).median, cls: "pink", key: "floor_0", groups: [1] },
      g43: { t: "37 to 43", s: "semester hours", fit: hc["fit_ACCE|floor|0"], of: hc.programs, medtext: `medians ${n(fg("37 to 40", 0).median)} and ${n(fg("41 to 43", 0).median)}`, cls: "pink", key: "floor_0", groups: [2, 3] },
      gcore: { t: "Institution’s own core", s: "no state or accreditor count", fit: fg("No state or accreditor count", 0).fit, of: fg("No state or accreditor count", 0).programs, med: fg("No state or accreditor count", 0).median, cls: "pink", key: "floor_0", groups: [4] },
      floor12: { t: "With the overlap", s: `count 37 to 43: ${of(hc[`fit_ACCE|floor|${OV}`], hc.programs)} fit`, fit: S14.all[`ACCE|floor|${OV}|binding`].fit, med: S14.all[`ACCE|floor|${OV}|binding`].median, cls: "peach strong", key: "floor_12" },
      outcomes: { t: "ACCE counts outcomes, not hours", s: `without the overlap: ${of(S14.acce_outcomes_only["0"].fit, N)}, median ${n(S14.acce_outcomes_only["0"].median)}`, fit: S14.acce_outcomes_only[String(OV)].fit, med: S14.acce_outcomes_only[String(OV)].median, cls: "peach strong", key: "outcomes_12" },
    };
    const card = (id) => { const d = NODES[id], tot = d.of || N;
      const body = d.fit == null ? "" : `<div class="pt-n">${of(d.fit, tot)} fit 90</div><div class="pt-m">${d.medtext || `median ${n(d.med, 1)} credits`}</div><div class="pt-bar"><i style="width:${(100 * d.fit / tot).toFixed(1)}%"></i></div>`;
      return `<div class="pt-node ${d.cls}" data-id="${id}" role="button" tabindex="0"><div class="pt-t">${esc(d.t)}</div><div class="pt-s">${esc(d.s)}</div>${body}</div>`; };
    const tag = (who) => `<div class="pt-tag">${esc(who)}</div>`;
    $("pt-tree").innerHTML = `<div class="pt-row">${card("root")}</div>${tag("program")}` +
      `<div class="pt-split"><div class="pt-col left">${card("keepall")}${tag("program")}<div class="pt-row two">${card("today")}${card("merge")}</div>${tag("state or system and institutional accreditor: the overlap")}<div class="pt-row two">${card("today12")}${card("merge12")}</div></div>` +
      `<div class="pt-col right"><div class="pt-row two wide">${card("floor")}${card("ansac")}</div>${tag("state or system and institutional accreditor: the general education count")}<div class="pt-row four">${card("g30")}${card("g36")}${card("g43")}${card("gcore")}</div>${tag("state or system and institutional accreditor: the overlap")}<div class="pt-row">${card("floor12")}</div>${tag("ACCE")}<div class="pt-row">${card("outcomes")}</div></div></div>`;
    function pick(id) {
      const d = NODES[id];
      $("pt-tree").querySelectorAll(".pt-node").forEach((x) => x.classList.toggle("sel", x.dataset.id === id));
      const k = d.key ? ki(d.key) : null;
      const cells = P.group_order.map((g, gi) => { const R0 = rows.filter((r) => r[0] === gi);
        return `<div class="pw-g"><div class="pw-k">${esc(GLABEL[g])}</div><div class="pw-cells">${R0.map((r) => { const inScope = !d.groups || d.groups.includes(gi); const fit = k && r[k] === 1;
          return `<span class="pw-c ${fit && inScope ? "fit" : ""} ${inScope ? "" : "out"}"></span>`; }).join("")}</div></div>`; }).join("");
      $("pt-waffle").innerHTML = cells;
      const cnt = k ? rows.filter((r) => (!d.groups || d.groups.includes(r[0])) && r[k] === 1).length : 0;
      const tot = d.groups ? rows.filter((r) => d.groups.includes(r[0])).length : rows.length;
      const label = d.groups ? `Cut to ACCE’s floors where the count is ${d.t}${d.s === "semester hours" ? " semester hours" : `: ${d.s}`}` : d.t;
      $("pt-msg").innerHTML = d.key ? `<b>${esc(label)}</b>: ${of(cnt, tot)} programs fit 90; filled squares are the programs that fit, grouped by the count their state asks.` : `<b>${esc(d.t)}</b>: ${esc(d.s)}. Choose a pathway to see which programs fit 90.`;
    }
    $("pt-tree").querySelectorAll(".pt-node").forEach((x) => { x.addEventListener("click", () => pick(x.dataset.id)); x.addEventListener("keydown", (e) => { if (e.key === "Enter") pick(x.dataset.id); }); });
    pick("merge12");
  }

  /* ---------------------------------------------------------------- the typical program */
  function typical(P) {
    const T = P.typical.filter((t) => t.today > 0 || t.merged_0 > 0 || t.merged_12 > 0 || t.floor_12 > 0).slice().reverse(), ts = P.summary.typical_steps;
    const D = [["today", `today, ${ts.today_total} credits`, "#D9D9D9"], ["merged_0", `every topic kept and merged, ${ts.every_topic_merged_0}`, "#9ECAE1"],
      ["merged_12", `with the overlap, ${ts.every_topic_merged_12}`, "#3182BD"], ["floor_12", `cut to ACCE’s floors with the overlap, ${ts.acce_floor_12}`, "#E6A15C"]];
    const STEP = [["today", ts.today_total], ["every topic kept and merged", ts.every_topic_merged_0], ["with the overlap", ts.every_topic_merged_12], ["cut to ACCE’s floors, with the overlap", ts.acce_floor_12]];
    $("tp-steps").innerHTML = STEP.map(([lab, v]) => `<div class="tp-step"><div class="tp-v">${v} <span class="muted small">credits</span></div><div class="tp-k">${esc(lab)}</div></div>`).join(`<div class="tp-arrow">→</div>`);
    plot("tp-chart", D.map(([k, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: T.map((t) => t.group), x: T.map((t) => t[k]), marker: { color: col, line: { color: "#333", width: .4 } },
      customdata: T.map((t) => (t.merges.length ? `merged: ${t.merges.join("; ")}` : "")),
      hovertemplate: `<b>%{y}</b><br>${esc(lab.replace(/, \d+$/, ""))}: %{x} hours<br>%{customdata}<extra></extra>` })),
    { barmode: "group", height: 760, margin: { l: 260, r: 16, t: 8, b: 80 }, showlegend: true, legend: { orientation: "h", y: -.06, font: { size: 11 } }, xaxis: { title: { text: "semester hours" }, dtick: 2 }, bargap: .25 });
    $("tp-note").textContent = `The program closest to the median of the ${P.summary.programs} modeled programs, course group by course group. Merges it can make: ${P.summary.typical.merges.join("; ")}, saving ${P.summary.typical.merged_saving} credits. With the overlap, ${ts.every_topic_merged_12_overlap} construction hours count as general education and the design adds ${ts.every_topic_merged_12_gen_ed_added} hour of general education to reach the count; general education courses that the count replaces are not kept.`;
  }

  /* ---------------------------------------------------------------- AI by course group and ACCE outcome */
  function aiMatrix(P) {
    const A = P.ai, G = A.groups.slice().reverse(), X = A.slo_names.map((_, i) => i + 1);
    const pts = [];
    G.forEach((g) => g.shares.forEach((v, j) => { if (v > 0) pts.push({ x: j + 1, y: g.group, v, e: g.ai_exposure, name: A.slo_names[j] }); }));
    plot("ai-matrix", [{ type: "scatter", mode: "markers+text", x: pts.map((p) => p.x), y: pts.map((p) => p.y),
      marker: { size: pts.map((p) => 6 + 26 * Math.sqrt(p.v)), color: pts.map((p) => ramp(p.e)), line: { color: "#333", width: .6 } },
      text: pts.map((p) => (p.v >= .25 ? String(Math.round(100 * p.v)) : "")), textfont: { size: 9 },
      customdata: pts.map((p) => `<b>${esc(p.y)}</b> (AI exposure ${dec(p.e)})<br>ACCE outcome ${p.x}, ${esc(p.name)}<br>${Math.round(100 * p.v)}% of the programs have a course in this group whose title names it`), hovertemplate: "%{customdata}<extra></extra>" }],
    { height: 560, margin: { l: 290, r: 16, t: 10, b: 140 }, xaxis: { tickvals: X, ticktext: X.map((x) => `${x} ${A.slo_names[x - 1]}`), tickangle: -55, range: [.4, 17.6], tickfont: { size: 10.5 } },
      yaxis: { tickvals: G.map((g) => g.group), ticktext: G.map((g) => `${g.group} (${dec(g.ai_exposure)})`), tickfont: { size: 11 } } });
    plot("ai-named", [{ type: "bar", x: X, y: A.slo_named_share.map((v) => 100 * v), marker: { color: "#BDBDBD", line: { color: "#333", width: .5 } }, text: A.slo_named_share.map((v) => share(v)), textposition: "outside", cliponaxis: false,
      customdata: A.slo_names, hovertemplate: "ACCE outcome %{x}, %{customdata}: named by a course title in %{y:.0f}% of the programs<extra></extra>" }],
    { height: 130, margin: { l: 290, r: 16, t: 14, b: 6 }, xaxis: { range: [.4, 17.6], showticklabels: false }, yaxis: { range: [0, 125], showticklabels: false, title: { text: "named at all", font: { size: 11 } } } });
  }

  /* ---------------------------------------------------------------- views */
  async function satisfy() {
    const [P, R, PA] = await Promise.all([load("paths"), load("rules"), load("paper")]);
    groupsMap(P, R);
    geography(P);
    window.Paper.paperTable("groups", PA.tables.groups);
  }
  async function routes() {
    const [P, M, R, PA] = await Promise.all([load("paths"), load("model"), load("rules"), load("paper")]);
    tree(P, M, R);
    typical(P);
    window.Paper.paperTable("merges", PA.tables.merges);
  }
  async function ai() {
    const P = await load("paths");
    aiMatrix(P);
  }
  return { satisfy, routes, ai, of };
})();
