/* AI and What to do (rewritten 6 November 2026, night, with the article: the content types of the modeled programs and
   the order of the holders; no program is named). */
window.Deep = (function () {
  const { load, $, esc, n, dec, median, plot } = window.U;
  const src = (e) => (e.cite ? (e.url ? ` <a class="cite" href="${esc(e.url)}" target="_blank" rel="noopener">(${esc(e.cite)})</a>` : ` <span class="cite">(${esc(e.cite)})</span>`) : "");

  /* ---------------------------------------------------------------- ai */
  async function ai() {
    const [X, PA] = await Promise.all([load("ai"), load("paper")]);
    const ct = X.content_types, N = X.programs_modeled;
    const ex = (k) => (X.exposure.find((e) => e.content_type === k) || {}).cm_human_beta;
    $("ai-lede").innerHTML = `The common case for a shorter degree in the AI era runs from tasks to hours: machines do the procedural work, so students need fewer hours. The course lists do not support it. The ${N} modeled programs carry a mean <b>${n(ct.digital_tool.today, 1)} hours</b> of digital tool operation against ${n(ct.judgment.today, 1)} of professional judgment and ${n(ct.technical.today, 1)} of technical foundations, and a design cut to ACCE’s floors still keeps ${n(ct.digital_tool["ACCE|floor|0"], 1)} of the tool hours, because those courses also name outcomes. The evidence on AI at work gives no reason to cut what remains, and one honest reason to count hours differently: if students reach the outcomes faster with well-designed tutoring, the outcomes should be assessed and the hours counted less.`;
    const T = [["technical", "technical foundations", "#BFBFBF"], ["judgment", "professional judgment", "#D4EBF2"], ["digital_tool", "digital tool operation", "#F4A582"], ["field_procedure", "field procedures", "#FDDBC7"], ["math_science", "mathematics and science", "#D9EAD3"], ["breadth", "communication and breadth", "#EAD1DC"], ["integrative", "capstone, work-integrated", "#FFF2CC"], ["other", "electives, other", "#FFFFFF"]];
    const grp = [["ACCE", ["ACCE", "ACCE and ABET"]], ["ABET ANSAC", ["ABET ANSAC", "ACCE and ABET"]], ["neither", ["neither", "ACCE applicant or candidate"]]];
    plot("ai-chart", T.map(([kk, lb, col]) => ({ type: "bar", orientation: "h", name: lb, y: grp.map((g) => g[0]), x: grp.map(([_, gs]) => median(X.ai_hours.filter((r) => gs.includes(r.accreditation_group)).map((r) => Number(r[kk])))),
      marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `%{y} programs: median of %{x} hours of ${lb}<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.35, font: { size: 10.5 } }, margin: { l: 90, r: 10, t: 6, b: 40 }, xaxis: { title: { text: "median hours of required courses, by content type" } } });
    // what each 90-credit design keeps, mean hours of the modeled programs (the article’s Table 4)
    const CT = [["technical", "technical foundations"], ["judgment", "professional judgment"], ["digital_tool", "digital tool operation"], ["field_procedure", "field procedures"],
      ["integrative", "capstone, work-integrated"], ["other construction", "other construction courses"], ["business", "business and management"], ["math_science", "mathematics and science"]];
    const D = [["today", "today", "#2F6F8F"], ["ACCE|floor|0", "kept at ACCE’s floors", "#B45F06"], ["ANSAC|floor|0", "kept at ABET ANSAC’s text", "#9A9A9A"]];
    plot("ct-chart", D.map(([k, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: CT.map((c) => c[1]).reverse(), x: CT.map((c) => ct[c[0]][k]).reverse(), marker: { color: col, line: { color: "#333", width: .4 } },
      hovertemplate: `<b>%{y}</b><br>${esc(lab)}: a mean %{x:.1f} hours<extra></extra>` })),
      { barmode: "group", showlegend: true, legend: { orientation: "h", y: -.2, font: { size: 11 } }, margin: { l: 190, r: 14, t: 6, b: 70 }, height: 420, xaxis: { title: { text: `mean hours, ${N} modeled programs, binding count, no overlap` } } });
    const TT = { scheduling_estimating: "scheduling, estimating", documentation_writing: "documentation, writing", analysis_calculation: "analysis, calculation", communication_people: "communicating with people", other_management_planning: "managing, planning", field_supervision_physical: "field supervision" };
    const mix = X.task_mix.filter((r) => Number(r.share_importance_weighted) > 0);
    plot("task-chart", [["11-9021", "construction managers", "#E69F00"], ["13-1051", "cost estimators", "#8c510a"]].map(([soc, nm, col]) => { const M = mix.filter((r) => r.soc === soc);
      return { type: "bar", orientation: "h", name: nm, y: M.map((r) => TT[r.task_type] || r.task_type), x: M.map((r) => Number(r.share_importance_weighted)), marker: { color: col },
        text: M.map((r) => "AI exposure " + dec(r.human_beta)), textposition: "outside", hovertemplate: `<b>%{y}</b><br>${nm[0].toUpperCase() + nm.slice(1)}: %{x:.0%} of tasks, %{text}<extra></extra>` }; }),
      { barmode: "group", showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } }, margin: { l: 160, r: 70, t: 6, b: 40 }, xaxis: { tickformat: ".0%", range: [0, 1.05], title: { text: "share of the occupation’s tasks" } } });
    $("ai-note").innerHTML = `Exposure (human-rated, Eloundou et al., 2024) measures how much a language model could speed up a task, not whether the human skill becomes unnecessary: the documentation and drafting that tool courses train carries ${dec(ex("digital_tool"))} for construction managers and is also the work whose output a graduate most often has to check; the work professional judgment trains carries ${dec(ex("judgment"))}, technical foundations ${dec(ex("technical"))} and communication with people ${dec(ex("breadth"))}.`;
    $("ai-ev").innerHTML = PA.ai_evidence.map((e) => `<li>${esc(e.text)}${src(e)}</li>`).join("");
  }

  /* ---------------------------------------------------------------- what to do */
  async function strategies() {
    const [PA, M] = await Promise.all([load("paper"), load("model")]);
    const S = M.summary, al = S.all, N = S.programs_modeled, f30 = S.fit_by_group["30 or fewer|ACCE|floor|0"];
    $("strat-lede").innerHTML = `Veto players imply an order. The program’s cut is necessary almost everywhere: keeping today’s courses, ${al["ACCE|keep|0|binding"].fit} of ${N} programs fit 90. It is enough where the count is 30 hours or fewer, where ${f30.fit} of ${f30.programs} fit at ACCE’s floors. Elsewhere one of two concessions by holders outside the program is needed as well: ACCE’s, which with one decision would bring every program into the winset (${S.acce_outcomes_only["0"].fit} of ${N} fit when its outcomes are kept without its hour floors), or the overlap, which brings in ${S.h3.brought_in_by_overlap} of the ${S.h3.outside_at_floor} programs left outside but must be granted state by state and accreditor by accreditor. States that ask more than ${S.rule_arithmetic.acce_threshold_count} hours of general education, and institutions that keep a larger core, decide whether 90 is reachable at all where no overlap is allowed; the first students offered a 90-credit degree should be those whose losses are smallest and whose enrollment is new.`;
    window.Paper.paperTable("strat", PA.tables.actions);
  }
  return { ai, strategies };
})();
