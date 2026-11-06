/* Rules, Abroad, Gains and losses, Routes to 90, Sources. */
window.Views = (function () {
  const { load, $, esc, n, money, k, share, dec, median, rows, table, plot, ACC, accTag, isNum } = window.U;
  const src = (e) => (e.cite ? (e.url ? ` <a class="cite" href="${esc(e.url)}" target="_blank" rel="noopener">(${esc(e.cite)})</a>` : ` <span class="cite">(${esc(e.cite)})</span>`) : "");
  const evList = (id, items) => { $(id).innerHTML = items.map((e) => `<li>${esc(e.text)}${src(e)}</li>`).join(""); };
  const pts = (v) => { const s = (100 * Number(v)).toFixed(1); return s.startsWith("0.") ? s.slice(1) : s; };

  /* ---------------------------------------------------------------- rules */
  async function rules() {
    const [R, K] = await Promise.all([load("rules"), load("skills")]);
    const b = R.budget, P = R.practice;
    const acce = P.find((p) => p.group === "ACCE only") || P[0], ans = P.find((p) => p.group.startsWith("ANSAC")) || P[1];
    $("rules-lede").innerHTML = `ACCE asks at least ${R.acce.construction_min} construction and ${R.acce.business_management_min} business hours and sets no total. ABET’s ANSAC asks 12 topics and no hours. Practice does not follow the text: accredited programs carry a median ${n(acce.professional_hours_median, 1)} professional hours under ACCE and ${n(ans.professional_hours_median, 1)} under ANSAC, the accreditor without an hour floor. For a student entering as a first-year, general education is what binds: the most a 90-credit version of the five programs read course by course can carry is <b>${b.budget_min} to ${b.budget_max} hours</b>, against institutional cores of ${R.floors.headline.gen_ed_core_min} to ${R.floors.headline.gen_ed_core_max}.`;
    table("criteria-table", [{ key: "item", label: "" }, { key: "ACCE", label: "ACCE Document 103 (rev. 2026.10.19)" }, { key: "ANSAC", label: "ABET ANSAC, construction management criteria (2026-27)" }], R.criteria);
    table("practice-table", [{ key: "group", label: "Programs", tip: "Construction management and construction science programs grouped by programmatic accreditation." },
      { key: "programs", label: "Number of programs", num: true, tip: "Programs in the group in the atlas." },
      { key: "total_median", label: "Median total credits", num: true, fmt: (v) => n(v), tip: "Median of the total semester credit hours the catalogs require." },
      { key: "professional_hours_p25", label: "Professional hours, 25th percentile", num: true, fmt: (v) => n(v, 1), tip: "Hours of required professional courses (technical, management, tool, field and capstone courses, classified from course titles) below which a quarter of the group lies." },
      { key: "professional_hours_median", label: "Professional hours, median", num: true, fmt: (v) => n(v, 1), tip: "Median hours of required professional courses in the group." },
      { key: "gen_ed_median", label: "General education, median", num: true, fmt: (v) => n(v), tip: "Median of the general education block as the catalogs publish it." },
      { key: "earn_1yr_median", label: "Median earnings, one year after", num: true, fmt: money, tip: "Median of the programs’ median earnings one year after completion (College Scorecard)." }], P);
    plot("practice-chart", [{ type: "bar", orientation: "h", y: P.map((p) => p.group), x: P.map((p) => Number(p.professional_hours_median)), marker: { color: ["#0072B2", "#E69F00", "#BDBDBD"], line: { color: "#333", width: .5 } },
      error_x: { type: "data", symmetric: false, array: P.map((p) => Number(p.professional_hours_p75) - Number(p.professional_hours_median)), arrayminus: P.map((p) => Number(p.professional_hours_median) - Number(p.professional_hours_p25)), color: "#333", thickness: 1 },
      hovertemplate: "%{y}: median of %{x} professional hours<extra></extra>" }],
      { margin: { l: 210, r: 20, t: 6, b: 40 }, xaxis: { title: { text: "professional course hours (median, 25th to 75th percentile)" }, range: [0, 90] },
        shapes: [{ type: "line", x0: 62, x1: 62, yref: "paper", y0: 0, y1: 1, line: { dash: "dash", color: "#0072B2" } }],
        annotations: [{ x: 62, yref: "paper", y: 1.02, text: "ACCE floor 62", showarrow: false, font: { size: 11, color: "#0072B2" } }] });
    calc(R);
    const T = K.transfer;
    $("transfer-text").innerHTML = `<p>An associate degree usually carries the general education, so for a transfer student general education does not bind; ACCE’s professional hours do. After ${T.associate_credits} associate credits a 90-credit degree leaves ${T.university_credits_left}, so at least <b>${T.professional_hours_needed_in_associate} of ACCE’s ${T.acce_professional_hours} professional hours</b> would have to come with the associate degree. That works only where the associate degree carries construction and business courses the bachelor’s program accepts as meeting its outcomes; ACCE itself accredits ${T.acce_accredited_associate_programs} associate programs, in ${T.states_with_acce_associate} states.</p>`;
  }

  function calc(R) {
    const progs = R.programs;
    const codes = Object.keys(progs);
    const box = $("calc-in");
    box.innerHTML = `<div class="chips" id="calc-prog">${codes.map((c) => `<span class="chip" data-c="${c}">${esc(progs[c].label)}</span>`).join("")}</div>` +
      [["con", "Construction hours kept", 30, 80], ["bus", "Business hours kept", 0, 25], ["ms", "Mathematics and science kept", 0, 30], ["over", "Of these, counted toward general education", 0, 30],
       ["ge", "General education hours required", 0, 45], ["pol", "Major hours allowed to count toward it (policy)", 0, 12]].map(([id, lab, lo, hi]) =>
        `<label>${lab}<input type="range" id="c-${id}" min="${lo}" max="${hi}" step="1"><span class="val" id="v-${id}"></span></label>`).join("");
    function set(code) {
      const p = progs[code];
      const sum = (cat, f) => p.courses.filter((c) => c[3] === cat && (!f || f(c))).reduce((a, c) => a + c[2], 0);
      const bus = R.acce.business_management_min, ms = sum("math_science");
      const over = p.courses.filter((c) => (c[3] === "math_science" || c[3] === "business") && c[4]).reduce((a, c) => a + c[2], 0);
      const vals = { con: R.acce.construction_min, bus, ms, over: Math.min(over, ms + bus), ge: code === "A" || code === "E" ? 30 : p.gen_ed_core, pol: 0 };
      Object.entries(vals).forEach(([kk, v]) => { $("c-" + kk).value = v; });
      box.querySelectorAll("#calc-prog .chip").forEach((c) => c.classList.toggle("on", c.dataset.c === code));
      $("calc-note").innerHTML = `${esc(p.institution)}, ${esc(p.program)}: cataloged construction ${sum("construction")} hours, business ${sum("business")} hours, mathematics and science ${ms} hours (of which ${sum("math_science", (c) => c[5])} hours earth science), general education and communication ${sum("communication_gen_ed")} hours; institution’s core about ${p.gen_ed_core} hours. <a href="${esc(p.catalog_url)}" target="_blank" rel="noopener">Catalog</a>.`;
      draw();
    }
    function draw() {
      const v = Object.fromEntries(["con", "bus", "ms", "over", "ge", "pol"].map((kk) => [kk, Number($("c-" + kk).value)]));
      Object.entries(v).forEach(([kk, x]) => { $("v-" + kk).textContent = x; });
      const gen = Math.max(0, v.ge - v.over - v.pol);
      const floor = v.con + v.bus + v.ms + gen;
      $("calc-floor").innerHTML = `${floor} credits ${floor <= 90 ? "<span style='color:#2f6b2f'>at or under 90</span>" : `<span style='color:#9b2c2c'>${floor - 90} above 90</span>`}`;
      plot("calc-chart", [["construction", v.con, "#BFBFBF"], ["business", v.bus, "#D9EAD3"], ["mathematics and science", v.ms, "#D4EBF2"], ["general education still needed", gen, "#EAD1DC"]].map(([lab, x, col]) =>
        ({ type: "bar", orientation: "h", y: ["floor"], x: [x], name: lab, marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `${lab[0].toUpperCase() + lab.slice(1)}: ${x} credits<extra></extra>` })),
        { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.35, font: { size: 11 } }, margin: { l: 40, r: 10, t: 10, b: 30 }, xaxis: { range: [0, 125] }, yaxis: { showticklabels: false },
          shapes: [{ type: "line", x0: 90, x1: 90, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#000", width: 1.4 } }] });
    }
    box.querySelectorAll("input[type=range]").forEach((x) => x.addEventListener("input", draw));
    box.querySelectorAll("#calc-prog .chip").forEach((c) => c.addEventListener("click", () => set(c.dataset.c)));
    set("A");
  }

  /* ---------------------------------------------------------------- abroad */
  async function abroad() {
    const [B, PA] = await Promise.all([load("abroad"), load("paper")]);
    const s = B.summary, sc = s.scale;
    $("abroad-lede").innerHTML = `Degree length is the visible outcome of three choices: where breadth sits, whether the degree is terminal or the first part of a longer formation, and how the graduate is formed afterwards. England specializes at 16, keeps the profession’s content in ${s.uk_three_year} of ${s.uk_records} three-year degrees, offers a placement year in ${s.uk_placement_available} and pairs chartership with supervised training. Much of Europe treats the three-year degree as the first part of five. Hong Kong moved a year of school into the degree in 2012 and split it between breadth and the profession. A U.S. 90-credit degree would change the length and leave the other two choices open.`;
    const cell = (items) => (items && items.length ? `<ul class="ev tight">${items.map((e) => `<li>${esc(e.text)}${src(e)}</li>`).join("")}</ul>` : `<span class="muted">not quantified here</span>`);
    $("ctx-table").innerHTML = `<thead><tr><th>System</th><th>Before the degree</th><th>The degree</th><th>After the degree</th></tr></thead><tbody>` +
      PA.abroad.map((r) => `<tr><td><b>${esc(r.system)}</b></td><td>${cell(r.before)}</td><td>${cell(r.during)}</td><td>${cell(r.after)}</td></tr>`).join("") + "</tbody>";
    plot("abroad-scale", [{ type: "bar", orientation: "h", y: ["England, 360 credits", "Scotland, 480 credits", "U.S., 90 credits", "U.S., 120 credits"],
      x: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours], marker: { color: ["#E69F00", "#BDBDBD", "#9ECAE1", "#0072B2"], line: { color: "#333", width: .5 } },
      text: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours].map((x) => n(x) + " h"), textposition: "outside", hovertemplate: "%{y}: %{x:,} hours<extra></extra>" }],
      { margin: { l: 140, r: 40, t: 6, b: 54 }, xaxis: { title: { text: "notional hours of student work (U.S. 45 per semester credit, 34 CFR 600.2; UK 10 per credit, QAA)" }, range: [0, 6500] } });
    const COMP = [["discipline", "discipline", "#BFBFBF"], ["mathematics and science", "mathematics and science", "#D9EAD3"], ["general education and breadth", "general education and breadth", "#EAD1DC"], ["project, capstone, work-integrated", "project, capstone, placement", "#FFF2CC"], ["electives and other", "electives and other", "#FFFFFF"]];
    plot("abroad-comp", COMP.map(([kk, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: s.composition_shares.map((r) => r.system.replace(" (120 credits, 4 years)", ", 4 years").replace(", five programs", " (5 programs)").replace("England, Wales, N. Ireland (360 credits, 3 years)", "England, Wales, NI, 3 years")), x: s.composition_shares.map((r) => 100 * r[kk]),
      marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `<b>%{y}</b><br>${lab[0].toUpperCase() + lab.slice(1)}: %{x:.0f}% of the credits<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } }, margin: { l: 230, r: 10, t: 6, b: 40 }, xaxis: { range: [0, 100], title: { text: "share of the degree’s credits (%)" } } });
    // the UK and Hong Kong program tables moved to their own atlases (6 November 2026)
  }

  /* ---------------------------------------------------------------- ledger */
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
    const pick = () => {
      const g = box.querySelector("#th-g .on").dataset.g;
      return K.threshold_inputs.filter((x) => g === "all" || (g === "ACCE" ? (x[6] === "ACCE" || x[6] === "ACCE and ABET") : g === "ABET ANSAC" ? (x[6] === "ABET ANSAC" || x[6] === "ACCE and ABET") : (x[6] === "neither" || x[6] === "ACCE applicant or candidate")));
    };
    function draw() {
      const H = Number($("th-h").value), r = Number(box.querySelector("#th-r .on").dataset.r), P = pick();
      $("th-hv").textContent = H;
      const lv = median(P.map((x) => levelT(x[3], x[1], x[2], H, r))), gr = median(P.map((x) => growthT(x[3], x[1], x[2], H, r)).filter((v) => v != null));
      const gain = median(P.map((x) => x[3]));
      $("th-out").innerHTML = `${share(lv, 1)} lower pay every year, or a gap widening ${gr == null ? "more than 20" : pts(gr)} points a year`;
      $("th-note").innerHTML = `Median over ${P.length} programs; median student gain ${money(gain)}. Either pay penalty, kept up for ${H} years at a ${share(r)} discount rate, would offset the gain. These are thresholds, not estimates: no study has measured the pay of 90-credit graduates. Earnings grow at each program’s rate from one to four years after completion for ten years and stay flat in real terms afterwards.`;
      const Hs = Array.from({ length: 36 }, (_, i) => i + 5);
      plot("th-chart", [{ type: "scatter", mode: "lines", x: Hs, y: Hs.map((h) => median(P.map((x) => levelT(x[3], x[1], x[2], h, r)))), line: { color: "#0072B2", width: 2 }, hovertemplate: "Counted over %{x} years: pay %{y:.1%} lower would offset the gain<extra></extra>" },
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
    $("survey").innerHTML = qs.map((q) => `<div class="sq"><div class="sqq">${esc(q.q)}</div>${q.a.map((a) => `<div class="sbar"><span class="sbl">${esc(a.answer.replace(/^other: /, "other: "))}</span><span class="sbv"><i style="width:${(100 * Number(a.respondents) / s.respondents).toFixed(0)}%"></i></span><span class="sbn">${a.respondents}</span></div>`).join("")}</div>`).join("") +
      `<p class="note">${esc(V.note)} A signal from one program, not an estimate.</p>`;
  }
  async function ledger() {
    const [L, A, K, V, PA] = await Promise.all([load("ledger"), load("atlas"), load("skills"), load("survey"), load("paper")]);
    const all = L.summary.find((r) => r.group === "all"), E = L.employers, lv = K.level_threshold, lc = K.lifecycle_threshold;
    const rng = K.general_education_share_range;
    $("ledger-lede").innerHTML = `The money moves from institutions to students at once, and any loss comes later. Per graduate, at the median program, the student gains <b>${money(all.s_total_gain_median)}</b>: ${money(all.s_tuition_saved_median)} of tuition and ${money(all.s_earnings_earlier_median)} of earnings a year sooner. The gain would be offset by pay ${share(lv.h10.median, 1)} lower for ten years, ${share(lv.h40.median, 1)} lower over a 40-year career, or a gap that widens ${pts(lc.h40.median)} points a year. The institution’s net is negative at ${share(all.share_institution_net_negative)} of programs, likely understated because the credits removed are among the cheapest to teach.`;
    $("party-cards").innerHTML = [
      ["Students", [["gain", `tuition for ${n(all.credits_removed_median)} credits, median ${money(all.s_tuition_saved_median)}, and a year of earnings sooner, median ${money(all.s_earnings_earlier_median)}`],
        ["loss", `general education, ${share(rng.low)} to ${share(rng.high)} of the hours removed in the five programs read course by course, unless it is taught inside major courses`],
        ["loss", "professional courses where a program cannot merge, and the internship if courses are cut carelessly"],
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
      marker: { size: 8, color: col, line: { color: "#222", width: .5 } }, text: G.map((p) => `<b>${esc(p.institution)}</b><br>Student gain per graduate: ${money(p.s_total_gain)}<br>Institution net per graduate: ${money(p.i_net)}<br>Pay lower by ${share(p.s_breakeven_discount_10yr, 1)} for ten years would offset the gain`), hovertemplate: "%{text}<extra></extra>" }; }),
      { showlegend: true, legend: { orientation: "h", y: -.18, font: { size: 11 } }, xaxis: { title: { text: "institution, net per graduate (USD)" }, zeroline: true, zerolinecolor: "#999" }, yaxis: { title: { text: "student gain per graduate (USD)" } }, margin: { l: 70, r: 14, t: 10, b: 60 } });
    table("ledger-table", [{ key: "group", label: "Group", tip: "Programs with a published total, grouped by control or accreditation." },
      { key: "programs", label: "Programs", num: true, tip: "Number of programs in the group." },
      { key: "s_total_gain_median", label: "Student gain per graduate", num: true, fmt: money, tip: "Median of tuition saved on the credits removed plus one year of first-year earnings sooner." },
      { key: "s_breakeven_discount_10yr_median", label: "Offsetting pay penalty over ten years", num: true, fmt: (v) => share(v, 1), tip: "How much lower a 90-credit graduate’s pay could be every year, for ten years at a 3% discount rate, before the student’s gain is gone. A threshold, not an estimate." },
      { key: "i_net_median", label: "Institution net per graduate", num: true, fmt: money, tip: "Median of instructional spending avoided less net tuition and state appropriations lost, for the share of a year removed." },
      { key: "share_institution_net_negative", label: "Share of programs where the institution loses", num: true, fmt: (v) => share(v), tip: "Share of the group’s programs whose institution net per graduate is negative." }], L.summary);
    table("ledger-case", [{ key: "institution", label: "Program", tip: "The five programs read course by course." },
      { key: "s_tuition_saved", label: "Tuition saved", num: true, fmt: money, tip: "In-state charge per credit times the credits removed to reach 90." },
      { key: "s_earnings_earlier", label: "Earnings a year sooner", num: true, fmt: money, tip: "Median earnings one year after completion (College Scorecard), counted once for the earlier start." },
      { key: "s_breakeven_discount_10yr", label: "Offsetting pay penalty over ten years", num: true, fmt: (v) => share(v, 1), tip: "How much lower pay could be every year, for ten years at 3%, before the gain is gone." },
      { key: "i_net", label: "Institution net per graduate", num: true, fmt: money, tip: "Instructional spending avoided less net tuition and state appropriations lost." }], Object.entries(L.case).map(([c, v]) => Object.assign({}, v, { institution: K.names[c] ? K.names[c].label : v.institution })));
    survey(V);
    evList("people-ev", PA.people);
    const T2 = PA.ledger_table;
    $("ledger-paper-title").textContent = T2.title;
    $("ledger-paper").innerHTML = `<thead><tr>${T2.rows[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${T2.rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    $("ledger-note").textContent = T2.notes.join(" ");
  }

  /* ---------------------------------------------------------------- routes */
  async function routes() {
    const [R, K] = await Promise.all([load("routes"), load("skills")]);
    const S = R.summary, F = K.construction_above_floor;
    const codes = ["A", "B", "C", "D", "E"];
    const lab = Object.fromEntries(codes.map((c) => [c, (R.ladder.find((r) => r.code === c) || {}).program || c]));
    $("routes-lede").innerHTML = `On the ACCE route every one of the five programs reaches 90 only when up to 12 hours of major courses may count toward general education. ${S.merge_candidates} pairs of topics are taught as one course in at least five accredited programs; merging them, and folding standalone tool courses into the courses that use the tools, keeps professional content that cutting whole courses removes. ACCE’s 50-hour construction floor decides where a merge can count: construction stands ${n(F.B, 1)}, ${n(F.D)} and ${n(F.E)} hours above it at Northern Arizona, Kansas State and East Carolina, and ${n(F.A)} hour above it at UT Knoxville, where no merge can save an hour.`;
    const STEPS = ["S0 as cataloged", "S1 free electives and orientation out", "S2 merges", "S3 AI-era tool redesign", "S4 professional courses to the route floor", "S5 general education to the count", "S6 policy overlap of 12", "S7 earth science cut"];
    const SHORT = ["catalog", "electives out", "merges", "tool redesign", "route floor", "gen. ed. count", "overlap 12", "earth science"];
    const LONG = ["As cataloged", "After free electives and orientation go", "After merging course pairs", "After folding tool courses", "After cutting to the route floor", "After cutting general education to the count", "After counting 12 major hours as general education", "After cutting earth science"];
    $("route-prog").innerHTML = codes.map((c) => `<span class="chip" data-c="${c}">${esc(lab[c])}</span>`).join("");
    function draw(c) {
      document.querySelectorAll("#route-prog .chip").forEach((x) => x.classList.toggle("on", x.dataset.c === c));
      const L = [["ACCE", "redesign first", "#0072B2", "solid", "ACCE route, merge and fold first"], ["ACCE", "cut only", "#0072B2", "dot", "ACCE route, cut whole courses"], ["ANSAC, practice floor", "redesign first", "#E69F00", "solid", "ANSAC route, practice floor"], ["ANSAC, text floor", "redesign first", "#E69F00", "dot", "ANSAC route, text floor"]];
      plot("route-chart", L.map(([rt, vr, col, dash, name]) => { const d = Object.fromEntries(R.ladder.filter((r) => r.code === c && r.route === rt && r.variant === vr && r.gen_ed_count === "binding rule").map((r) => [r.step, r.hours]));
        return { type: "scatter", mode: "lines+markers", name, x: SHORT, y: STEPS.map((s) => Number(d[s])), customdata: LONG, line: { color: col, dash, width: dash === "solid" ? 2.4 : 1.4 }, marker: { size: 7 }, hovertemplate: `<b>${name}</b><br>%{customdata}: %{y} credits<extra></extra>` }; }),
        { showlegend: true, legend: { orientation: "h", y: -.2, font: { size: 11 } }, yaxis: { title: { text: "semester credit hours" }, range: [20, 125] }, margin: { l: 60, r: 14, t: 10, b: 70 },
          shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 90, y1: 90, line: { dash: "dot", color: "#000", width: 1.2 } }] });
      const e = R.ladder.find((r) => r.code === c && r.route === "ACCE" && r.variant === "redesign first" && r.step === "first step at or under 90" && r.gen_ed_count === "binding rule") || {};
      $("route-note").innerHTML = `Each step runs to its floor, so the full ladder overshoots 90; the tab What 90 removes stops at exactly 90. ACCE route: merges ${esc(e.merges || "none available")}; tool courses folded: ${esc(e.tool_courses || "none")}. The ANSAC text floor shows what the criteria allow, not what any program does.`;
    }
    document.querySelectorAll("#route-prog .chip").forEach((x) => x.addEventListener("click", () => draw(x.dataset.c)));
    draw("A");
    table("pairs-table", [{ key: "topic_a", label: "Topic", tip: "A construction topic coded from course titles by written rules." },
      { key: "topic_b", label: "Paired topic", tip: "The topic taught with it." },
      { key: "programs_one_course", label: "Programs teaching both in one course", num: true, tip: "Accredited programs (ACCE or ABET ANSAC) whose course list carries both topics in a single course." },
      { key: "programs_separate", label: "Programs teaching them in two courses", num: true, tip: "Accredited programs that teach the two topics in separate courses." },
      { key: "credits_saved", label: "Hours saved by merging", num: true, fmt: (v) => n(v, 1), tip: "Median credits of the two separate courses less the median credits of the single course." }], R.pairs);
  }

  /* ---------------------------------------------------------------- sources */
  async function sources() {
    const S = await load("sources");
    $("refs-list").innerHTML = S.references.map((r) => `<li>${esc(r.apa).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u.replace(/\.$/, "")}" target="_blank" rel="noopener">${u}</a>`)}</li>`).join("");
    table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Date" }, { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }], S.data);
    $("files-list").innerHTML = ["atlas", "courses", "states", "rules", "skills", "ledger", "survey", "routes", "abroad", "paper", "sources"].map((f) => `<li><a href="data/${f}.json" target="_blank">data/${f}.json</a></li>`).join("");
  }
  return { rules, abroad, ledger, routes, sources };
})();
