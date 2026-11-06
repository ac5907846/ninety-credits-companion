/* Rules, Abroad, Gains and losses, Routes to 90, Sources. */
window.Views = (function () {
  const { load, $, esc, n, money, k, share, dec, median, rows, table, plot, ACC, accTag, isNum } = window.U;

  /* ---------------------------------------------------------------- rules */
  async function rules() {
    const R = await load("rules");
    const fl = R.floors.headline, b = R.budget;
    $("rules-lede").innerHTML = `ACCE asks at least ${R.acce.construction_min} construction and ${R.acce.business_management_min} business hours and sets no total. ABET’s ANSAC asks 12 topics and no hours. Under those floors alone every one of the five programs read course by course fits in 90 credits; the general education count puts each above 90. The most general education a 90-credit version of these programs can carry is <b>${b.budget_min} to ${b.budget_max} hours</b>, against institutional cores of 34 to 40.`;
    table("criteria-table", [{ key: "item", label: "" }, { key: "ACCE", label: "ACCE Document 103 (rev. 2026.10.19)" }, { key: "ANSAC", label: "ABET ANSAC, construction management criteria (2026-27)" }], R.criteria);
    const P = R.practice;
    table("practice-table", [{ key: "group", label: "Programs" }, { key: "programs", label: "n", num: true }, { key: "total_median", label: "Median total", num: true, fmt: (v) => n(v) },
      { key: "professional_hours_p25", label: "Professional hours, 25th pct.", num: true, fmt: (v) => n(v, 1) }, { key: "professional_hours_median", label: "median", num: true, fmt: (v) => n(v, 1) },
      { key: "gen_ed_median", label: "Gen. ed. median", num: true, fmt: (v) => n(v) }, { key: "earn_1yr_median", label: "Earnings, 1 yr", num: true, fmt: money }], P);
    plot("practice-chart", [{ type: "bar", orientation: "h", y: P.map((p) => p.group), x: P.map((p) => Number(p.professional_hours_median)), marker: { color: ["#0072B2", "#E69F00", "#BDBDBD"], line: { color: "#333", width: .5 } },
      error_x: { type: "data", symmetric: false, array: P.map((p) => Number(p.professional_hours_p75) - Number(p.professional_hours_median)), arrayminus: P.map((p) => Number(p.professional_hours_median) - Number(p.professional_hours_p25)), color: "#333", thickness: 1 },
      hovertemplate: "%{y}: median %{x} professional hours<extra></extra>" }],
      { margin: { l: 210, r: 20, t: 6, b: 40 }, xaxis: { title: { text: "professional course hours (median, 25th to 75th percentile)" }, range: [0, 90] },
        shapes: [{ type: "line", x0: 62, x1: 62, yref: "paper", y0: 0, y1: 1, line: { dash: "dash", color: "#0072B2" } }],
        annotations: [{ x: 62, yref: "paper", y: 1.02, text: "ACCE floor 62", showarrow: false, font: { size: 11, color: "#0072B2" } }] });
    calc(R);
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
      const con = Math.max(R.acce.construction_min, Math.min(sum("construction"), 80));
      const bus = R.acce.business_management_min, ms = sum("math_science");
      const over = p.courses.filter((c) => (c[3] === "math_science" || c[3] === "business") && c[4]).reduce((a, c) => a + c[2], 0);
      const vals = { con: R.acce.construction_min, bus, ms, over: Math.min(over, ms + bus), ge: code === "A" || code === "E" ? 30 : p.gen_ed_core, pol: 0 };
      Object.entries(vals).forEach(([kk, v]) => { $("c-" + kk).value = v; });
      box.querySelectorAll("#calc-prog .chip").forEach((c) => c.classList.toggle("on", c.dataset.c === code));
      $("calc-note").innerHTML = `${esc(p.institution)}, ${esc(p.program)}: cataloged construction ${sum("construction")} h, business ${sum("business")} h, mathematics and science ${ms} h (of which ${sum("math_science", (c) => c[5])} h earth science), general education and communication ${sum("communication_gen_ed")} h; institution’s core about ${p.gen_ed_core} h. <a href="${esc(p.catalog_url)}" target="_blank" rel="noopener">Catalog</a>.`;
      draw();
    }
    function draw() {
      const v = Object.fromEntries(["con", "bus", "ms", "over", "ge", "pol"].map((kk) => [kk, Number($("c-" + kk).value)]));
      Object.entries(v).forEach(([kk, x]) => { $("v-" + kk).textContent = x; });
      const gen = Math.max(0, v.ge - v.over - v.pol);
      const floor = v.con + v.bus + v.ms + gen;
      $("calc-floor").innerHTML = `${floor} credits ${floor <= 90 ? "<span style='color:#2f6b2f'>at or under 90</span>" : `<span style='color:#9b2c2c'>${floor - 90} above 90</span>`}`;
      plot("calc-chart", [["construction", v.con, "#BFBFBF"], ["business", v.bus, "#D9EAD3"], ["mathematics and science", v.ms, "#D4EBF2"], ["general education still needed", gen, "#EAD1DC"]].map(([lab, x, col]) =>
        ({ type: "bar", orientation: "h", y: ["floor"], x: [x], name: lab, marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `${lab}: ${x}<extra></extra>` })),
        { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.35, font: { size: 11 } }, margin: { l: 40, r: 10, t: 10, b: 30 }, xaxis: { range: [0, 125] }, yaxis: { showticklabels: false },
          shapes: [{ type: "line", x0: 90, x1: 90, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#000", width: 1.4 } }] });
    }
    box.querySelectorAll("input[type=range]").forEach((x) => x.addEventListener("input", draw));
    box.querySelectorAll("#calc-prog .chip").forEach((c) => c.addEventListener("click", () => set(c.dataset.c)));
    set("A");
  }

  /* ---------------------------------------------------------------- abroad */
  async function abroad() {
    const B = await load("abroad");
    const s = B.summary, sc = s.scale;
    const uk = B.programs.filter((p) => p.system === "UK"), hk = B.programs.filter((p) => p.system === "Hong Kong");
    $("abroad-lede").innerHTML = `${s.uk_three_year} of the ${s.uk_records} CIOB-accredited construction management honours degrees in the United Kingdom take three years full time (360 credits, ${n(sc.uk_honours_360_hours)} hours of study; Scotland’s take four). They carry almost no general education: discipline is ${share(s.composition_shares[1].discipline)} of the taught credits. Hong Kong went the other way in 2012, from three years to four, and the extra year was largely general education and language: HKU’s BSc in Surveying grew from ${s.hku_reform.three_year_credits} to ${s.hku_reform.four_year_credits} credits, of which ${s.hku_reform.added_common_core} Common Core and ${s.hku_reform.added_language} language.`;
    plot("abroad-scale", [{ type: "bar", orientation: "h", y: ["England, 360 credits", "Scotland, 480 credits", "U.S., 90 credits", "U.S., 120 credits"],
      x: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours], marker: { color: ["#E69F00", "#BDBDBD", "#9ECAE1", "#0072B2"], line: { color: "#333", width: .5 } },
      text: [sc.uk_honours_360_hours, sc.uk_scottish_480_hours, sc.us_90_hours, sc.us_120_hours].map((x) => n(x) + " h"), textposition: "outside", hovertemplate: "%{y}: %{x:,} hours<extra></extra>" }],
      { margin: { l: 140, r: 40, t: 6, b: 54 }, xaxis: { title: { text: "hours of student work (U.S. 45 per semester credit, 34 CFR 600.2; UK 10 per credit, QAA)" }, range: [0, 6500] } });
    const COMP = [["discipline", "discipline", "#BFBFBF"], ["mathematics and science", "mathematics and science", "#D9EAD3"], ["general education and breadth", "general education and breadth", "#EAD1DC"], ["project, capstone, work-integrated", "project, capstone, placement", "#FFF2CC"], ["electives and other", "electives and other", "#FFFFFF"]];
    plot("abroad-comp", COMP.map(([kk, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: s.composition_shares.map((r) => r.system.replace(" (120 credits, 4 years)", ", 4 years").replace(", five programs", " (5 programs)").replace("England, Wales, N. Ireland (360 credits, 3 years)", "England, Wales, NI, 3 years")), x: s.composition_shares.map((r) => 100 * r[kk]),
      marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `%{y}<br>${lab}: %{x:.0f}%<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } }, margin: { l: 230, r: 10, t: 6, b: 40 }, xaxis: { range: [0, 100], title: { text: "share of the degree’s credits (%)" } } });
    table("uk-table", [{ key: "institution", label: "University" }, { key: "country", label: "Country" }, { key: "program", label: "Program" }, { key: "duration_years", label: "Years", num: true, fmt: (v) => n(v) },
      { key: "placement_available", label: "Placement year", fmt: (v) => (v === "True" ? "offered" : "") }, { key: "fee_home", label: "Home fee (GBP)", num: true, fmt: (v) => n(v) },
      { key: "fee_international", label: "International fee (GBP)", num: true, fmt: (v) => n(v) }, { key: "accreditations", label: "Accreditation stated" },
      { key: "url", label: "Source", fmt: (v, r) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">course page</a>` : "") + (r.spec_url ? ` <a href="${esc(r.spec_url)}" target="_blank" rel="noopener">specification</a>` : "") }], uk, { sortKey: "institution" });
    if (hk.length) {
      $("hk-panel").hidden = false;
      $("hk-text").innerHTML = `<p class="muted">Ten construction and surveying bachelor’s degrees, all four years since the 2012 reform. General education shares differ by definition; the table gives each institution’s own count.</p>`;
      table("hk-table", [{ key: "institution", label: "Institution" }, { key: "program", label: "Program" }, { key: "duration_years", label: "Years", num: true, fmt: (v) => n(v) }, { key: "total_credits_local", label: "Credits", num: true, fmt: (v) => n(v) },
        { key: "gen_ed_credits", label: "General education credits", num: true, fmt: (v) => n(v) }, { key: "fee_home", label: "Local fee (HKD)", num: true, fmt: (v) => n(v) }, { key: "accreditations", label: "Accreditation stated" },
        { key: "url", label: "Source", fmt: (v) => (v && v !== "None" ? `<a href="${esc(v)}" target="_blank" rel="noopener">program page</a>` : "") }], hk);
    }
  }

  /* ---------------------------------------------------------------- ledger */
  async function ledger() {
    const [L, A] = await Promise.all([load("ledger"), load("atlas")]);
    const all = L.summary.find((r) => r.group === "all"), E = L.employers;
    $("ledger-lede").innerHTML = `Per graduate, at the median program, a 90-credit degree gives the student <b>${money(all.s_total_gain_median)}</b>: ${money(all.s_tuition_saved_median)} of tuition and a year of earnings, ${money(all.s_earnings_earlier_median)}. The gain is gone only if employers pay 90-credit graduates about ${share(all.s_breakeven_discount_10yr_median)} less every year for ten years. The institution loses net revenue at ${share(all.share_institution_net_negative)} of programs (median ${money(all.i_net_median)} per graduate). Employers receive graduates a year sooner; the field’s graduates fill about ${share(E.graduates_share_of_cm_openings)} of construction manager openings a year.`;
    $("party-cards").innerHTML = [
      ["Students", [["gain", `tuition for ${n(all.credits_removed_median)} credits, median ${money(all.s_tuition_saved_median)}`], ["gain", `a year of earnings sooner, median ${money(all.s_earnings_earlier_median)}`], ["loss", "general education and electives they would have taken; a degree some graduate schools may read as shorter"], ["loss", `a pay discount, if employers apply one: break-even ${share(all.s_breakeven_discount_10yr_median, 1)} for ten years`]]],
      ["Institutions", [["loss", `tuition revenue for the year, median ${money(all.i_tuition_lost_median)} per graduate`], ["loss", `state appropriations where funding follows enrollment, median ${money(all.i_approp_lost_median)}`], ["gain", `instructional cost avoided, median ${money(all.i_instruction_saved_median)} (an upper bound)`], ["gain", "seats freed for more students; a cheaper, faster degree may draw them"]]],
      ["Employers", [["gain", `a cohort a year earlier: about ${n(E.one_time_transition_cohort)} graduates once, during the transition`], ["gain", `hard-to-fill roles: ${esc(E.agc_hard_to_fill)} (% of firms with openings)`], ["loss", "less communication and breadth, the gap employers already name"], ["loss", "more of the first year’s training falls on the firm"]]],
    ].map(([t, items]) => `<div class="party"><h3>${t}</h3><ul>${items.map(([g, x]) => `<li class="${g}">${g === "gain" ? "Gains" : "Loses"}: ${x}</li>`).join("")}</ul></div>`).join("");
    const P = rows(A).filter((p) => isNum(p.s_total_gain) && isNum(p.i_net));
    plot("ledger-scatter", ACC.map(([g, lab, col]) => { const G = P.filter((p) => p.accreditation_group === g); return { type: "scatter", mode: "markers", name: lab, x: G.map((p) => p.i_net), y: G.map((p) => p.s_total_gain),
      marker: { size: 8, color: col, line: { color: "#222", width: .5 } }, text: G.map((p) => `${esc(p.institution)}<br>student ${money(p.s_total_gain)}; institution ${money(p.i_net)}; break-even ${share(p.s_breakeven_discount_10yr, 1)}`), hovertemplate: "%{text}<extra></extra>" }; }),
      { showlegend: true, legend: { orientation: "h", y: -.18, font: { size: 11 } }, xaxis: { title: { text: "institution, net per graduate (USD)" }, zeroline: true, zerolinecolor: "#999" }, yaxis: { title: { text: "student gain per graduate (USD)" } }, margin: { l: 70, r: 14, t: 10, b: 60 } });
    table("ledger-table", [{ key: "group", label: "Group" }, { key: "programs", label: "Programs", num: true }, { key: "s_total_gain_median", label: "Student gain", num: true, fmt: money },
      { key: "s_breakeven_discount_10yr_median", label: "Break-even discount", num: true, fmt: (v) => share(v, 1) }, { key: "i_net_median", label: "Institution net", num: true, fmt: money },
      { key: "share_institution_net_negative", label: "Institution loses", num: true, fmt: (v) => share(v) }], L.summary);
    table("ledger-case", [{ key: "institution", label: "Program" }, { key: "s_tuition_saved", label: "Tuition saved", num: true, fmt: money }, { key: "s_earnings_earlier", label: "Earlier earnings", num: true, fmt: money },
      { key: "s_breakeven_discount_10yr", label: "Break-even", num: true, fmt: (v) => share(v, 1) }, { key: "i_net", label: "Institution net", num: true, fmt: money }], Object.values(L.case));
    $("ledger-note").textContent = `Accounting ledger, first order: credits removed = published total minus 90; tuition at the in-state per-credit charge (IPEDS 2023-24); earnings one year after completion (Scorecard field of study; group median where missing); break-even over ${L.assumptions.horizon_years} years at a ${share(L.assumptions.discount_rate)} discount rate; institution: net tuition and state appropriations per FTE lost, instructional spending per FTE avoided, each for the share of a year removed. No change in enrollment, completion or pay is assumed.`;
  }

  /* ---------------------------------------------------------------- routes */
  async function routes() {
    const R = await load("routes");
    const S = R.summary, A = R.ai_summary;
    const codes = ["A", "B", "C", "D", "E"];
    const lab = Object.fromEntries(codes.map((c) => [c, (R.ladder.find((r) => r.code === c) || {}).program || c]));
    $("routes-lede").innerHTML = `${S.merge_candidates} pairs of topics are taught as one course in at least five accredited programs; merging them, and folding standalone digital tool courses into the courses that use the tools, cuts less content than cutting whole courses. On the ACCE route every one of the five programs reaches 90 only when up to 12 hours of major courses may count toward general education. Accredited programs spend a median ${n(A.median_hours_accredited.digital_tool)} hours on digital tool operation and ${n(A.median_hours_accredited.judgment)} on professional judgment; AI changes the first most.`;
    const STEPS = ["S0 as cataloged", "S1 free electives and orientation out", "S2 merges", "S3 AI-era tool redesign", "S4 professional courses to the route floor", "S5 general education to the count", "S6 policy overlap of 12", "S7 earth science cut"];
    const SHORT = ["catalog", "electives out", "merges", "tool redesign", "route floor", "gen. ed. count", "overlap 12", "earth science"];
    $("route-prog").innerHTML = codes.map((c) => `<span class="chip" data-c="${c}">${esc(lab[c])}</span>`).join("");
    function draw(c) {
      document.querySelectorAll("#route-prog .chip").forEach((x) => x.classList.toggle("on", x.dataset.c === c));
      const L = [["ACCE", "redesign first", "#0072B2", "solid", "ACCE route, redesign first"], ["ACCE", "cut only", "#0072B2", "dot", "ACCE route, cut only"], ["ANSAC, practice floor", "redesign first", "#E69F00", "solid", "ANSAC route, practice floor"], ["ANSAC, text floor", "redesign first", "#E69F00", "dot", "ANSAC route, text floor"]];
      plot("route-chart", L.map(([rt, vr, col, dash, name]) => { const d = Object.fromEntries(R.ladder.filter((r) => r.code === c && r.route === rt && r.variant === vr && r.gen_ed_count === "binding rule").map((r) => [r.step, r.hours]));
        return { type: "scatter", mode: "lines+markers", name, x: SHORT, y: STEPS.map((s) => Number(d[s])), line: { color: col, dash, width: dash === "solid" ? 2.4 : 1.4 }, marker: { size: 7 }, hovertemplate: `${name}<br>%{x}: %{y} credits<extra></extra>` }; }),
        { showlegend: true, legend: { orientation: "h", y: -.2, font: { size: 11 } }, yaxis: { title: { text: "semester credit hours" }, range: [20, 125] }, margin: { l: 60, r: 14, t: 10, b: 70 },
          shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 90, y1: 90, line: { dash: "dot", color: "#000", width: 1.2 } }] });
      const e = R.ladder.find((r) => r.code === c && r.route === "ACCE" && r.variant === "redesign first" && r.step === "first step at or under 90" && r.gen_ed_count === "binding rule") || {};
      const cr = R.ladder.find((r) => r.code === c && r.route === "ACCE" && r.variant === "redesign first" && r.step === "professional content cut outright" && r.gen_ed_count === "binding rule") || {};
      const cc = R.ladder.find((r) => r.code === c && r.route === "ACCE" && r.variant === "cut only" && r.step === "professional content cut outright" && r.gen_ed_count === "binding rule") || {};
      $("route-note").innerHTML = `ACCE route: merges ${esc(e.merges || "none available")}; tool courses folded: ${esc(e.tool_courses || "none")}. Professional content cut outright: ${cr.hours} hours with redesign first, ${cc.hours} cutting only. The ANSAC text floor shows what the criteria allow, not what any program does.`;
    }
    document.querySelectorAll("#route-prog .chip").forEach((x) => x.addEventListener("click", () => draw(x.dataset.c)));
    draw("A");
    table("pairs-table", [{ key: "topic_a", label: "Topic" }, { key: "topic_b", label: "with" }, { key: "programs_one_course", label: "Programs teaching them as one course", num: true },
      { key: "programs_separate", label: "as two courses", num: true }, { key: "credits_saved", label: "Hours saved", num: true, fmt: (v) => n(v, 1) }], R.pairs);
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
  }

  /* ---------------------------------------------------------------- sources */
  async function sources() {
    const S = await load("sources");
    table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Date" }, { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }], S);
    $("files-list").innerHTML = ["atlas", "courses", "states", "rules", "ledger", "routes", "abroad", "sources"].map((f) => `<li><a href="data/${f}.json" target="_blank">data/${f}.json</a></li>`).join("");
  }
  return { rules, abroad, ledger, routes, sources };
})();
