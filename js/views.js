/* The accreditors’ texts and practice, Compare, Gains and losses, Sources (rewritten 6 November 2026, night: no program
   is named outside the atlases). */
window.Views = (function () {
  const { load, $, esc, n, money, share, median, rows, table, plot, ACC, isNum } = window.U;
  const src = (e) => (e.cite ? (e.url ? ` <a class="cite" href="${esc(e.url)}" target="_blank" rel="noopener">(${esc(e.cite)})</a>` : ` <span class="cite">(${esc(e.cite)})</span>`) : "");
  const evList = (id, items) => { $(id).innerHTML = items.map((e) => `<li>${esc(e.text)}${src(e)}</li>`).join(""); };
  const pts = (v) => { const s = (100 * Number(v)).toFixed(1); return s.startsWith("0.") ? s.slice(1) : s; };

  /* ---------------------------------------------------------------- the programmatic accreditors: text and practice */
  async function rules() {
    const R = await load("rules");
    const P = R.practice;
    table("criteria-table", [{ key: "item", label: "" }, { key: "ACCE", label: "ACCE Document 103 (rev. 2026.10.19)" }, { key: "ANSAC", label: "ABET ANSAC, construction management criteria (2026-27)" }], R.criteria);
    table("practice-table", [{ key: "group", label: "Programs", tip: "Construction management and construction science programs grouped by programmatic accreditation." },
      { key: "programs", label: "Number of programs", num: true, tip: "Programs in the group in the atlas." },
      { key: "total_median", label: "Median total credits", num: true, fmt: (v) => n(v), tip: "Median of the total semester credit hours the catalogs require." },
      { key: "professional_hours_p25", label: "Professional hours, 25th percentile", num: true, fmt: (v) => n(v, 1), tip: "Hours of required professional courses (technical, management, tool, field and capstone courses, classified from course titles) below which a quarter of the group lies." },
      { key: "professional_hours_median", label: "Professional hours, median", num: true, fmt: (v) => n(v, 1), tip: "Median hours of required professional courses in the group." },
      { key: "gen_ed_median", label: "General education, median", num: true, fmt: (v) => n(v), tip: "Median of the general education block as the catalogs publish it." },
      { key: "earn_1yr_median", label: "Median earnings, one year after", num: true, fmt: money, tip: "Median of the programs’ median earnings one year after completion (College Scorecard)." }], P);
    const floor = R.acce.construction_min + R.acce.business_management_min;
    plot("practice-chart", [{ type: "bar", orientation: "h", y: P.map((p) => p.group), x: P.map((p) => Number(p.professional_hours_median)), marker: { color: ["#0072B2", "#E69F00", "#BDBDBD"], line: { color: "#333", width: .5 } },
      error_x: { type: "data", symmetric: false, array: P.map((p) => Number(p.professional_hours_p75) - Number(p.professional_hours_median)), arrayminus: P.map((p) => Number(p.professional_hours_median) - Number(p.professional_hours_p25)), color: "#333", thickness: 1 },
      hovertemplate: "%{y}: median of %{x} professional hours<extra></extra>" }],
      { margin: { l: 210, r: 20, t: 6, b: 40 }, xaxis: { title: { text: "professional course hours (median, 25th to 75th percentile)" }, range: [0, 90] },
        shapes: [{ type: "line", x0: floor, x1: floor, yref: "paper", y0: 0, y1: 1, line: { dash: "dash", color: "#0072B2" } }],
        annotations: [{ x: floor, yref: "paper", y: 1.02, text: `ACCE floors ${floor}`, showarrow: false, font: { size: 11, color: "#0072B2" } }] });
  }

  /* ---------------------------------------------------------------- Compare */
  async function abroad() {
    const B = await load("abroad");
    const s = B.summary, sc = s.scale;
    $("abroad-lede").innerHTML = `Degree length is the visible outcome of three choices: where breadth sits, whether the degree is terminal or the first part of a longer formation, and how the graduate is formed afterwards. England specializes at 16, keeps the profession’s content in ${s.uk_three_year} of ${s.uk_records} three-year degrees, offers a placement year in ${s.uk_placement_available} and pairs chartership with supervised training. Much of Europe treats the three-year degree as the first part of five. Hong Kong moved a year of school into the degree in 2012 and split it between breadth and the profession. A U.S. 90-credit degree would change the length and leave the other two choices open.`;
    await window.Paper.compare();
    plot("abroad-scale", [{ type: "bar", orientation: "h", y: ["England, 360 credits", "Scotland, 480 credits", "U.S., 90 credits", "U.S., 120 credits"],
      x: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours], marker: { color: ["#E69F00", "#BDBDBD", "#9ECAE1", "#0072B2"], line: { color: "#333", width: .5 } },
      text: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours].map((x) => n(x) + " h"), textposition: "outside", hovertemplate: "%{y}: %{x:,} hours<extra></extra>" }],
      { margin: { l: 140, r: 40, t: 6, b: 54 }, xaxis: { title: { text: "notional hours of student work (U.S. 45 per semester credit, 34 CFR 600.2; UK 10 per credit, QAA)" }, range: [0, 6500] } });
    const COMP = [["discipline", "discipline", "#BFBFBF"], ["mathematics and science", "mathematics and science", "#D9EAD3"], ["general education and breadth", "general education and breadth", "#EAD1DC"], ["project, capstone, work-integrated", "project, capstone, placement", "#FFF2CC"], ["electives and other", "electives and other", "#FFFFFF"]];
    plot("abroad-comp", COMP.map(([kk, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: s.composition_shares.map((r) => r.system.replace("England, Wales, N. Ireland (360 credits, 3 years)", "England, Wales, NI, 3 years")), x: s.composition_shares.map((r) => 100 * r[kk]),
      marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `<b>%{y}</b><br>${lab[0].toUpperCase() + lab.slice(1)}: %{x:.0f}% of the credits<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } }, margin: { l: 230, r: 10, t: 6, b: 40 }, xaxis: { range: [0, 100], title: { text: "share of the degree’s credits (%)" } } });
  }

  /* ---------------------------------------------------------------- Gains and losses */
  function pathOf(e1, g, H) { const p = []; for (let t = 0; t < H; t++) p.push(e1 * Math.pow(1 + g, Math.min(t, 9))); return p; }
  function levelT(gain, e1, g, H, r) { const es = pathOf(e1, g, H); return gain / es.reduce((a, e, t) => a + e / Math.pow(1 + r, t + 1), 0); }
  function growthT(gain, e1, g, H, r) {
    const es = pathOf(e1, g, H);
    const loss = (d) => es.reduce((a, e, t) => a + e * (1 - Math.pow(1 - d, t)) / Math.pow(1 + r, t + 1), 0);
    let lo = 0, hi = .2; if (loss(hi) < gain) return null;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (loss(m) < gain) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function thresholdTool(K) {
    const box = $("th-in");
    const groups = [["all", "all programs with a published total"], ["ACCE", "ACCE accredited"], ["ABET ANSAC", "ABET ANSAC"], ["other", "neither, applicant or candidate"]];
    box.innerHTML = `<label>Years counted<input type="range" id="th-h" min="5" max="40" step="1" value="40"><span class="val" id="th-hv"></span></label>
      <div class="ctrl"><span class="flabel">Discount rate</span><div class="chips" id="th-r"><span class="chip on" data-r=".03">3%</span><span class="chip" data-r=".05">5%</span></div></div>
      <div class="ctrl"><span class="flabel">Programs</span><div class="chips" id="th-g">${groups.map(([g, l], i) => `<span class="chip${i ? "" : " on"}" data-g="${g}">${esc(l)}</span>`).join("")}</div></div>`;
    // threshold_inputs rows: [first-year earnings, growth from one to four years, student gain, accreditation group]
    const pick = () => {
      const g = box.querySelector("#th-g .on").dataset.g;
      return K.threshold_inputs.filter((x) => g === "all" || (g === "ACCE" ? (x[3] === "ACCE" || x[3] === "ACCE and ABET") : g === "ABET ANSAC" ? (x[3] === "ABET ANSAC" || x[3] === "ACCE and ABET") : (x[3] === "neither" || x[3] === "ACCE applicant or candidate")));
    };
    function draw() {
      const H = Number($("th-h").value), r = Number(box.querySelector("#th-r .on").dataset.r), P = pick();
      $("th-hv").textContent = H;
      const lv = median(P.map((x) => levelT(x[2], x[0], x[1], H, r))), gr = median(P.map((x) => growthT(x[2], x[0], x[1], H, r)).filter((v) => v != null));
      const gain = median(P.map((x) => x[2]));
      $("th-out").innerHTML = `${share(lv, 1)} lower pay every year, or a gap widening ${gr == null ? "more than 20" : pts(gr)} points a year`;
      $("th-note").innerHTML = `Median over ${P.length} programs; median student gain ${money(gain)}. Either pay penalty, kept up for ${H} years at a ${share(r)} discount rate, would offset the gain. These are thresholds, not estimates: no study has measured the pay of 90-credit graduates. Earnings grow at each program’s rate from one to four years after completion for ten years and stay flat in real terms afterwards.`;
      const Hs = Array.from({ length: 36 }, (_, i) => i + 5);
      plot("th-chart", [{ type: "scatter", mode: "lines", x: Hs, y: Hs.map((h) => median(P.map((x) => levelT(x[2], x[0], x[1], h, r)))), line: { color: "#0072B2", width: 2 }, hovertemplate: "Counted over %{x} years: pay %{y:.1%} lower would offset the gain<extra></extra>" },
        { type: "scatter", mode: "markers", x: [H], y: [lv], marker: { size: 10, color: "#0072B2" }, hoverinfo: "skip" }],
        { margin: { l: 56, r: 14, t: 8, b: 40 }, xaxis: { title: { text: "years counted" } }, yaxis: { title: { text: "pay penalty that offsets the gain" }, tickformat: ".0%", rangemode: "tozero" } });
    }
    box.querySelectorAll("#th-r .chip, #th-g .chip").forEach((c) => c.addEventListener("click", () => { c.parentElement.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); draw(); }));
    $("th-h").addEventListener("input", draw);
    draw();
  }
  function survey(V) {
    const s = V.summary;
    $("survey-title").textContent = `Industry advisors of one accredited program (${s.respondents} respondents, October 2026, anonymous)`;
    const qs = []; V.counts.forEach((c) => { let q = qs.find((x) => x.q === c.question); if (!q) { q = { q: c.question, a: [] }; qs.push(q); } q.a.push(c); });
    $("survey").innerHTML = qs.map((q) => `<div class="sq"><div class="sqq">${esc(q.q)}</div>${q.a.map((a) => `<div class="sbar"><span class="sbl">${esc(a.answer)}</span><span class="sbv"><i style="width:${(100 * Number(a.respondents) / s.respondents).toFixed(0)}%"></i></span><span class="sbn">${a.respondents}</span></div>`).join("")}</div>`).join("") +
      `<p class="note">${esc(V.note)} A signal from one program, not an estimate.</p>`;
  }
  async function ledger() {
    const [L, A, K, V, PA, M] = await Promise.all([load("ledger"), load("atlas"), load("skills"), load("survey"), load("paper"), load("model")]);
    const all = L.summary.find((r) => r.group === "all"), E = L.employers, lv = K.level_threshold, lc = K.lifecycle_threshold;
    const af = M.summary.all["ACCE|floor|0|binding"];
    $("ledger-lede").innerHTML = `The money moves from institutions to students at once, and any loss comes later. Per graduate, at the median program, the student gains <b>${money(all.s_total_gain_median)}</b>: ${money(all.s_tuition_saved_median)} of tuition and ${money(all.s_earnings_earlier_median)} of earnings a year sooner. The gain would be offset by pay ${share(lv.h10.median, 1)} lower for ten years, ${share(lv.h40.median, 1)} lower over a 40-year career, or a gap that widens ${pts(lc.h40.median)} points a year. The institution’s net is negative at ${share(all.share_institution_net_negative)} of programs, likely understated because the credits removed are among the cheapest to teach.`;
    $("party-cards").innerHTML = [
      ["Students", [["gain", `tuition for ${n(all.credits_removed_median)} credits, median ${money(all.s_tuition_saved_median)}, and a year of earnings sooner, median ${money(all.s_earnings_earlier_median)}`],
        ["loss", `breadth: cut to ACCE’s floors, the median design replaces breadth courses, electives and orientation with the ${n(af.gen_ed_added_median)} hours of general education the count still needs, unless general education is taught inside major courses`],
        ["loss", `${n(af.dropped_construction_median)} construction hours at the median design, and the internship at ${af.internship_dropped} of the ${af.internship_listed} programs that list one`],
        ["loss", "a degree some graduate schools may not accept, and a label (applied or career-focused) that differs from the four-year degree"]]],
      ["Institutions", [["loss", `net tuition for the removed year, median ${money(all.i_tuition_lost_median)}, and state appropriations where funding follows enrollment, median ${money(all.i_approp_lost_median)}`],
        ["gain", `instructional cost avoided, median ${money(all.i_instruction_saved_median)} per graduate, an upper bound`],
        ["gain", "enrollment in a shrinking market, and persistence of adults who bring credit for prior learning"]]],
      ["Employers", [["gain", `a cohort a year earlier, once: about ${n(E.one_time_transition_cohort)} graduates against ${n(E.openings_construction_managers_per_year)} construction manager openings a year`],
        ["loss", "communication and critical thinking, which about half of employers already find short in new graduates"],
        ["loss", "field preparation if the internship goes, and more formation inside the firm as AI absorbs junior tasks"]]],
    ].map(([t, items]) => `<div class="party"><h3>${t}</h3><ul>${items.map(([g, x]) => `<li class="${g}">${g === "gain" ? "Gains" : "Loses"}: ${x}</li>`).join("")}</ul></div>`).join("");
    thresholdTool(K);
    const P = rows(A).filter((p) => isNum(p.s_total_gain) && isNum(p.i_net));
    plot("ledger-scatter", ACC.map(([g, lab, col]) => { const G = P.filter((p) => p.accreditation_group === g); return { type: "scatter", mode: "markers", name: lab, x: G.map((p) => p.i_net), y: G.map((p) => p.s_total_gain),
      marker: { size: 8, color: col, line: { color: "#222", width: .5 } }, text: G.map((p) => `<b>${esc(lab)}</b><br>Student gain per graduate: ${money(p.s_total_gain)}<br>Institution net per graduate: ${money(p.i_net)}<br>Pay lower by ${share(p.s_breakeven_discount_10yr, 1)} for ten years would offset the gain`), hovertemplate: "%{text}<extra></extra>" }; }),
      { showlegend: true, legend: { orientation: "h", y: -.18, font: { size: 11 } }, xaxis: { title: { text: "institution, net per graduate (USD)" }, zeroline: true, zerolinecolor: "#999" }, yaxis: { title: { text: "student gain per graduate (USD)" } }, margin: { l: 70, r: 14, t: 10, b: 60 } });
    table("ledger-table", [{ key: "group", label: "Group", tip: "Programs with a published total, grouped by control or accreditation." },
      { key: "programs", label: "Programs", num: true, tip: "Number of programs in the group." },
      { key: "s_total_gain_median", label: "Student gain per graduate", num: true, fmt: money, tip: "Median of tuition saved on the credits removed plus one year of first-year earnings sooner." },
      { key: "s_breakeven_discount_10yr_median", label: "Offsetting pay penalty over ten years", num: true, fmt: (v) => share(v, 1), tip: "How much lower a 90-credit graduate’s pay could be every year, for ten years at a 3% discount rate, before the student’s gain is gone. A threshold, not an estimate." },
      { key: "i_net_median", label: "Institution net per graduate", num: true, fmt: money, tip: "Median of instructional spending avoided less net tuition and state appropriations lost, for the share of a year removed." },
      { key: "share_institution_net_negative", label: "Share of programs where the institution loses", num: true, fmt: (v) => share(v), tip: "Share of the group’s programs whose institution net per graduate is negative." }], L.summary);
    survey(V);
    evList("people-ev", PA.people);
  }

  /* ---------------------------------------------------------------- Sources */
  async function sources() {
    const S = await load("sources");
    $("refs-list").innerHTML = S.references.map((r) => `<li>${esc(r.apa).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u.replace(/\.$/, "")}" target="_blank" rel="noopener">${u}</a>`)}</li>`).join("");
    table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Date" }, { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }], S.data);
    $("files-list").innerHTML = ["atlas", "courses", "states", "model", "paper", "rules", "skills", "ledger", "balance", "survey", "ai", "abroad", "uk", "hk", "sources"].map((f) => `<li><a href="data/${f}.json" target="_blank">data/${f}.json</a></li>`).join("");
  }
  return { rules, abroad, ledger, sources };
})();
