/* UK Atlas and Hong Kong Atlas (6 November 2026): maps, filters, tiles, charts, tables and program cards. */
window.World = (function () {
  const { load, $, esc, n, median, table, plot } = window.U;
  const gbp = (v) => (v == null || v === "" ? "" : "£" + Number(v).toLocaleString("en-US"));
  const hkd = (v) => (v == null || v === "" ? "" : "HK$" + Number(v).toLocaleString("en-US"));
  const link = (u, t) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>` : "");
  const TYPES = [["technical", "technical foundations", "#BFBFBF"], ["judgment", "professional judgment", "#D4EBF2"], ["digital_tool", "digital tool operation", "#F4A582"],
    ["field_procedure", "field procedures", "#FDDBC7"], ["math_science", "mathematics and science", "#D9EAD3"], ["breadth", "communication and breadth", "#EAD1DC"],
    ["integrative", "projects, dissertations, placements", "#FFF2CC"], ["other", "electives and other", "#FFFFFF"]];
  const progName = (p) => { const t = p.program || ""; return !p.award || /\bB(Sc|A|Eng)\b|Bachelor|\(Hons\)/.test(t) ? t : `${p.award} ${t}`; };
  const campusShort = (p) => { const c = p.campus || ""; const m = c.match(/\(([^)]+)\)/); return c.startsWith(p.university.split(" (")[0]) && m ? m[1] : c.replace(/ \(.*\)/, ""); };
  const yearLabel = (y) => { const t = String(y ?? ""); if (!t) return "Courses"; if (/^[0-9]+$/.test(t)) return `Year ${t}`; const h = t.replace(/_/g, " "); return h.charAt(0).toUpperCase() + h.slice(1) + (/year/i.test(h) ? "" : " year"); };
  const codeOf = (p) => { if (p.ucas) return ` (UCAS ${esc(p.ucas)})`; const j = String(p.jupas || ""); const a = j.match(/JS[0-9]{4}/); if (a) return ` (JUPAS ${a[0]})`; const b = j.match(/[0-9]{5}-[A-Z]+/); return b ? ` (programme code ${b[0]})` : ""; };
  const CSRC = { stated: "stated", list: "module list", framework: "national minimum" };
  const CSRC_LONG = { stated: "as the course page or specification states", list: "read from the module list, 120 credits a taught year", framework: "the national minimum for an honours degree (QAA, 2024); the page states no total" };
  const yearCredits = (p, sep = "; ") => {
    const by = p.credits_by_year || [];
    if (!by.length) return (p.modules || []).length ? "titles only" : "no module list";
    return by.map(([y, c, o]) => `<span style="white-space:nowrap">Year ${y}: ${n(c)}${o ? ` + ${n(o)} options` : ""}</span>`).join(sep);
  };
  const headCredits = (mods, y) => {
    const ms = mods.filter((m) => m[0] === y && m[3] != null);
    if (!ms.length) return "";
    const core = ms.filter((m) => m[4] !== "option").reduce((a, m) => a + m[3], 0), opt = ms.filter((m) => m[4] === "option");
    if (y === "placement" || y === "study_abroad_year") {
      const c = core || Math.max(...opt.map((m) => m[3]));
      return c ? `: ${n(c)} credits` : ": no credits";
    }
    return `: ${n(core)} credits of core modules${opt.length ? `, options listed ${n(opt.reduce((a, m) => a + m[3], 0))}` : ""}`;
  };
  function openCard(html) {
    $("card").innerHTML = `<button class="close" id="card-close" type="button">Close</button>${html}`;
    $("card-back").hidden = false;
    $("card-close").onclick = () => { $("card-back").hidden = true; };
  }
  function chips(id, opts, onChange) {
    $(id).innerHTML = opts.map(([v, l]) => `<span class="chip" data-v="${esc(v)}">${esc(l)}</span>`).join("");
    $(id).querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { c.classList.toggle("on"); onChange(); }));
  }
  const picked = (id) => Array.from($(id).querySelectorAll(".chip.on")).map((c) => c.dataset.v);
  /* One marker per place. A campus that holds several programs gets one dark marker whose hover lists them all, so no
     program hides under another; a click on it opens a short list of its programs. cats: [key, legend label, color]. */
  function placeTraces(G, cats, catOf, headOf, linesOf, oneLine, size) {
    const groups = new Map();
    G.filter((p) => p.lat != null).forEach((p) => { const k = p.lat.toFixed(4) + "," + p.lon.toFixed(4); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
    const singles = [], multi = [];
    groups.forEach((g) => (g.length > 1 ? multi.push(g) : singles.push(g[0])));
    const tr = cats.map(([key, label, color]) => { const S = singles.filter((p) => catOf(p) === key);
      return { type: "scattermap", mode: "markers", name: label, lat: S.map((p) => p.lat), lon: S.map((p) => p.lon), marker: { size, color, opacity: .9 },
        customdata: S.map((p) => p.id), text: S.map((p) => `<b>${esc(headOf(p))}</b><br>${linesOf(p)}`), hovertemplate: "%{text}<extra></extra>" }; });
    if (multi.length) {
      tr.push({ type: "scattermap", mode: "markers", name: "several programs at one campus", lat: multi.map((g) => g[0].lat), lon: multi.map((g) => g[0].lon),
        marker: { size: size + 4, color: "#3A3A3A", opacity: .85 }, customdata: multi.map((g) => g.map((p) => p.id).join("|")),
        text: multi.map((g) => `<b>${esc(Array.from(new Set(g.map(headOf))).join(" and "))}</b>: ${g.length} programs<br>` + g.map((p) => `${esc(progName(p))}: ${oneLine(p)}`).join("<br>")),
        hovertemplate: "%{text}<extra></extra>" });
    }
    return tr.filter((t) => t.lat.length);
  }
  function onPick(elId, P, cardFn, headOf) {
    const el = $(elId);
    if (el.removeAllListeners) el.removeAllListeners("plotly_click");
    el.on("plotly_click", (e) => {
      const ids = String(e.points[0].customdata).split("|");
      const L = ids.map((id) => P.find((x) => x.id === id)).filter(Boolean);
      if (L.length === 1) { cardFn(L[0]); return; }
      openCard(`<h2>${esc(Array.from(new Set(L.map(headOf))).join(" and "))}</h2><div class="muted">${L.length} programs at this campus</div>
        <ul class="plist">${L.map((p) => `<li><button type="button" class="linkish" data-id="${esc(p.id)}">${esc(progName(p))}${codeOf(p)}</button>${p.ciob_entry ? `<div class="muted small">CIOB list entry: ${esc(p.ciob_entry)}</div>` : ""}</li>`).join("")}</ul>`);
      $("card").querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => cardFn(L.find((p) => p.id === b.dataset.id))));
    });
  }
  function compChart(id, rows, labelOf) {
    const R = rows.filter((r) => r.comp).map((r) => { const tot = TYPES.reduce((a, [kk]) => a + (r.comp[kk] || 0), 0); return { r, tot }; }).filter((x) => x.tot > 0);
    R.sort((a, b) => ((b.r.comp.technical + b.r.comp.judgment) / b.tot) - ((a.r.comp.technical + a.r.comp.judgment) / a.tot));
    const ys = R.map((x) => labelOf(x.r));
    plot(id, TYPES.map(([kk, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: ys, x: R.map((x) => 100 * (x.r.comp[kk] || 0) / x.tot),
      marker: { color: col, line: { color: "#333", width: .4 } }, hovertemplate: `<b>%{y}</b><br>${lab[0].toUpperCase() + lab.slice(1)}: %{x:.0f}% of the credits<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.08, yanchor: "top", font: { size: 10.5 } }, margin: { l: 230, r: 10, t: 6, b: 10 },
        xaxis: { range: [0, 100], title: { text: "share of the degree’s credits (%)" }, side: "top" }, yaxis: { autorange: "reversed", tickfont: { size: 10.5 }, automargin: true }, height: Math.max(320, 22 * ys.length + 150) });
  }

  /* ---------------------------------------------------------------- UK */
  async function uk() {
    const D = await load("uk");
    const P = D.programs, S = D.summary;
    const unis = new Set(P.map((p) => p.university)).size;
    $("uk-lede").innerHTML = `${P.length} construction management honours degrees at ${unis} universities appear on the Chartered Institute of Building’s list of accredited programmes (27 March 2026). ${S.uk_three_year} take three years full time; ${S.uk_placement_available} offer a placement year in industry, which makes the degree four years for students who take it. England, Wales and Northern Ireland award 360 credits of 10 notional hours each; Scotland’s honours degrees take four years. At Brighton and Coventry two list entries now lead to one current course under a new title; both records stay, and each card says so. Every program links to its course page and, where published, its programme specification.`;
    chips("uk-country", ["England", "Scotland", "Wales", "Northern Ireland"].map((c) => [c, c]), draw);
    chips("uk-years", [["3", "three years"], ["4", "four years"]], draw);
    chips("uk-place", [["yes", "placement year offered"], ["no", "no placement year"]], draw);
    $("uk-q").addEventListener("input", draw);
    $("uk-reset").addEventListener("click", () => { ["uk-country", "uk-years", "uk-place"].forEach((id) => $(id).querySelectorAll(".chip").forEach((c) => c.classList.remove("on"))); $("uk-q").value = ""; draw(); });
    function filtered() {
      const c = picked("uk-country"), y = picked("uk-years"), pl = picked("uk-place"), q = $("uk-q").value.trim().toLowerCase();
      return P.filter((p) => (!c.length || c.includes(p.country)) && (!y.length || y.includes(String(p.years))) && (!pl.length || pl.includes(p.placement ? "yes" : "no")) &&
        (!q || `${p.university} ${p.campus} ${p.program}`.toLowerCase().includes(q)));
    }
    function draw() {
      const F = filtered();
      const fees = F.map((p) => p.fee_home).filter((v) => v != null), fi = F.map((p) => p.fee_int).filter((v) => v != null);
      const cr = median(F.map((p) => p.credits_degree).filter((v) => v != null)) || 0;
      const t = [[n(F.length), `programs at ${n(new Set(F.map((p) => p.university)).size)} universities`], [n(F.filter((p) => p.years === 3).length), "take three years full time"],
        [n(F.filter((p) => p.placement).length), "offer a placement year in industry"], [gbp(median(fees)), "median home fee a year"], [gbp(median(fi)), "median international fee a year"],
        [n(cr), `median UK credits for the degree: ${n(10 * cr)} notional hours, about ${n(Math.round(10 * cr / 45))} U.S. semester credits`]];
      $("uk-tiles").innerHTML = t.map(([v, kk]) => `<div class="tile"><div class="v">${v || "n/a"}</div><div class="k">${kk}</div></div>`).join("");
      const dur = (p) => (p.years ? p.years + " years full time" : "duration not stated");
      plot("uk-map", placeTraces(F, [[3, "three years full time", "#E69F00"], [4, "four years full time", "#0072B2"], [null, "duration not stated", "#8C8C8C"]],
        (p) => p.years || null, (p) => p.university,
        (p) => `Campus: ${esc(p.campus || "not stated")}<br>${esc(progName(p))}<br>Duration: ${p.years ? p.years + " years full time" : "not stated"}${p.placement && p.years ? `, ${p.years_with_placement || p.years + 1} with a placement year` : ""}<br>Home fee: ${gbp(p.fee_home) || "not stated"} a year${p.fee_home_year ? ` (${esc(p.fee_home_year)})` : ""}<br>Accreditation stated: ${esc(p.accreditation || "not stated")}`,
        (p) => `${dur(p)}, home fee ${gbp(p.fee_home) || "not stated"}`, 11),
        { map: { style: "carto-positron", center: { lat: 54.1, lon: -3.0 }, zoom: 4.6 }, margin: { l: 0, r: 0, t: 0, b: 0 }, showlegend: true, legend: { orientation: "h", x: 0, y: 1, bgcolor: "rgba(255,255,255,.85)" } });
      onPick("uk-map", P, card, (p) => p.university);
      const base = (p) => `${p.university.replace(/ \(.*\)/, "")}${P.filter((x) => x.university === p.university).length > 1 ? ", " + campusShort(p) : ""}`;
      const cnt = {}; F.forEach((p) => { cnt[base(p)] = (cnt[base(p)] || 0) + 1; });
      const lab = (p) => (cnt[base(p)] > 1 ? `${base(p)}: ${(p.program || "").replace(/B(Sc|A|Eng) ?(\(Hons\))?/g, "").replace(/ \(.*\)/, "").trim()}` : base(p));  // two programs at one campus keep two rows
      compChart("uk-comp", F, lab);
      const FF = F.filter((p) => p.fee_home != null).sort((a, b) => a.fee_home - b.fee_home);
      plot("uk-fee", [{ type: "scatter", mode: "markers", name: "home fee a year", y: FF.map(lab), x: FF.map((p) => p.fee_home), marker: { size: 9, color: "#0072B2" }, hovertemplate: "<b>%{y}</b><br>Home fee: £%{x:,} a year<extra></extra>" },
        { type: "scatter", mode: "markers", name: "international fee a year", y: FF.map(lab), x: FF.map((p) => p.fee_int), marker: { size: 9, color: "#E69F00", symbol: "diamond" }, hovertemplate: "<b>%{y}</b><br>International fee: £%{x:,} a year<extra></extra>" }],
        { showlegend: true, legend: { orientation: "h", y: 1.02, yanchor: "bottom" }, margin: { l: 230, r: 14, t: 30, b: 40 }, xaxis: { title: { text: "pounds a year" }, tickformat: ",", rangemode: "tozero" }, yaxis: { autorange: "reversed", tickfont: { size: 10.5 } }, height: Math.max(320, 20 * FF.length + 110) });
      $("uk-count").textContent = `(${F.length} shown)`;
      table("uk-atlas-table", [
        { key: "university", label: "University", tip: "The university or college that offers the degree." },
        { key: "campus", label: "Campus", tip: "Campus or site of teaching as the course page states it." },
        { key: "country", label: "Country", tip: "Country of the United Kingdom." },
        { key: "program", label: "Program", fmt: (v, r) => esc(progName(r)), tip: "Award and programme title as the course page states them." },
        { key: "years", label: "Full-time years", num: true, tip: "Normal length of the full-time degree, without a placement year." },
        { key: "credits_degree", label: "Credits for the degree", num: true, fmt: (v, r) => (v == null ? "" : `${n(v)}<br><span class="muted small" style="white-space:nowrap">${CSRC[r.credits_source] || ""}</span>`), tip: "UK credits of the honours degree, 10 notional hours each: stated on the course page or specification; read from a full module list, 120 credits a taught year; or the national minimum (QAA, 2024: 360 in England, Wales and Northern Ireland, 480 in Scotland)." },
        { key: "credits_by_year", label: "Credits a year in the module list", fmt: (v, r) => yearCredits(r, "<br>"), tip: "Credits of the modules the page lists for each taught year (Year 1, 2, 3 ...); a plus sign adds the option modules listed beyond the core, from which students choose. Titles only: the page lists modules without credits." },
        { key: "placement", label: "Placement year", fmt: (v, r) => (!v ? "no" : r.placement_credits == null ? "offered, credits not stated" : r.placement_credits === 0 ? "offered, no credits" : `offered, ${n(r.placement_credits)} credits`), tip: "Whether an optional year of paid work in industry is offered, which adds a year to the degree, and the credits the module list gives it (some universities award none)." },
        { key: "fee_home", label: "Home fee a year (pounds)", num: true, fmt: gbp, tip: "Annual tuition fee for students from the United Kingdom, as the university publishes it for the entry year shown in the program card." },
        { key: "fee_int", label: "International fee a year (pounds)", num: true, fmt: gbp, tip: "Annual tuition fee for international students, as the university publishes it." },
        { key: "accreditation", label: "Accreditation stated", tip: "Professional bodies the course page names: CIOB (Chartered Institute of Building), RICS (Royal Institution of Chartered Surveyors), CABE (Chartered Association of Building Engineers) and others." },
        { key: "url", label: "Sources", fmt: (v, r) => [link(v, "course page"), link(r.spec_url, "specification")].filter(Boolean).join(" "), tip: "Links to the course page and the programme specification read for this atlas." },
      ], F, { onRow: card, sortKey: "university" });
    }
    function card(p) {
      const mods = p.modules || [];
      const years = Array.from(new Set(mods.map((m) => m[0]))).sort();
      openCard(`<h2>${esc(p.university)}</h2><div class="muted">${esc(progName(p))}${p.campus ? `, ${esc(p.campus)}` : ""}</div>
        <div class="links">${link(p.url, "Course page")}${link(p.spec_url, "Programme specification")}</div>
        <dl><dt>Country</dt><dd>${esc(p.country)}</dd><dt>UCAS code</dt><dd>${esc(p.ucas || "not stated")}</dd>
          <dt>Duration</dt><dd>${p.years ? p.years + " years full time" : "not stated"}${p.placement && p.years ? `; ${p.years_with_placement || p.years + 1} years with the placement year` : ""}</dd>
          <dt>Placement year</dt><dd>${esc(p.placement_note || (p.placement ? "offered" : "not offered"))}</dd>
          <dt>Credits for the degree</dt><dd>${p.credits_degree ? `${n(p.credits_degree)} UK credits, ${CSRC_LONG[p.credits_source]}` : "not stated"}${p.credits_by_level ? ` (${Object.entries(p.credits_by_level).map(([k2, v]) => `${k2.replace("level_", "level ")}: ${v}`).join(", ")})` : ""}${p.credits_degree ? `; ${n(10 * p.credits_degree)} notional hours at 10 hours a credit, about ${n(Math.round(10 * p.credits_degree / 45))} U.S. semester credits at 45 hours each` : ""}</dd>
          <dt>Credits a year</dt><dd>${yearCredits(p)}${p.placement ? `; placement year: ${p.placement_credits == null ? "credits not stated" : p.placement_credits === 0 ? "no credits" : n(p.placement_credits) + " credits"}` : ""}</dd>
          <dt>Accreditation stated</dt><dd>${esc(p.accreditation || "not stated")}</dd><dt>CIOB list entry</dt><dd>${esc(p.ciob_entry)}</dd>
          <dt>Home fee</dt><dd>${gbp(p.fee_home) || "not stated"} a year${p.fee_home_year ? ` (${esc(p.fee_home_year)})` : ""}</dd>
          <dt>International fee</dt><dd>${gbp(p.fee_int) || "not stated"} a year</dd>
          ${p.fee_placement_note ? `<dt>Placement year fee</dt><dd>${esc(p.fee_placement_note)}</dd>` : ""}
          ${p.part_time ? `<dt>Part-time study</dt><dd>${esc(p.part_time)}</dd>` : ""}
          <dt>Read on</dt><dd>${esc(p.read_on)}</dd></dl>
        ${mods.length ? years.map((y) => `<h4>${esc(yearLabel(y))}${headCredits(mods, y)}</h4><table class="data"><thead><tr><th>Module</th><th class="n">Credits</th><th>Type</th></tr></thead><tbody>${mods.filter((m) => m[0] === y).map((m) => `<tr><td>${esc((m[1] ? m[1] + " " : "") + m[2])}</td><td class="n">${m[3] ?? ""}</td><td>${esc(m[4] || "")}</td></tr>`).join("")}</tbody></table>`).join("") : `<p class="muted">The course page does not publish a full module list.</p>`}
        ${p.notes ? `<h4>Notes</h4><p class="muted">${esc(p.notes)}</p>` : ""}
        <p class="note">Map point: ${esc(p.place || "not located")} (OpenStreetMap).</p>`);
    }
    draw();
  }

  /* ---------------------------------------------------------------- Hong Kong */
  async function hk() {
    const D = await load("hk");
    const P = D.programs, R = D.reform;
    $("hk-lede").innerHTML = `${P.length} construction, surveying and building engineering bachelor’s degrees at ${new Set(P.map((p) => p.institution)).size} institutions. All take four years, since the 2012 reform replaced the three-year degree after seven years of secondary school with a four-year degree after six. General education is counted by each institution’s own definition (common core, university requirements, language), so the table gives each count as stated. Every program links to its programme page and, where published, its curriculum document.`;
    const fundGroup = (p) => (/^UGC/.test(p.funding) ? "government-funded (UGC)" : "self-financing");
    const tl = P.map((p) => p.fee_local).filter((v) => v != null);
    const ugc = P.filter((p) => fundGroup(p) !== "self-financing" && p.fee_local != null).map((p) => p.fee_local);
    const sf = P.filter((p) => fundGroup(p) === "self-financing" && p.fee_local != null).map((p) => p.fee_local);
    const gen = P.map((p) => p.gen_ed_credits).filter((v) => v != null);
    const t = [[n(P.length), `programs at ${n(new Set(P.map((p) => p.institution)).size)} institutions`],
      [n(median(P.map((p) => p.total_credits).filter((v) => v != null))), "median total credits (local units)"],
      [`${n(Math.min(...gen))} to ${n(Math.max(...gen))}`, "general education credits, as each institution counts them"],
      [ugc.length && Math.min(...ugc) === Math.max(...ugc) ? hkd(ugc[0]) : `${hkd(Math.min(...ugc))} to ${hkd(Math.max(...ugc))}`, "local fee a year, government-funded places"],
      [`${hkd(Math.min(...sf))} to ${hkd(Math.max(...sf))}`, "local fee a year, self-financing programs"],
      [n(P.filter((p) => (p.courses || []).length).length), "publish a course list"]];
    $("hk-tiles").innerHTML = t.map(([v, kk]) => `<div class="tile"><div class="v">${v || "n/a"}</div><div class="k">${kk}</div></div>`).join("");
    plot("hk-map", placeTraces(P, [["government-funded (UGC)", "government-funded (UGC)", "#0072B2"], ["self-financing", "self-financing", "#E69F00"]],
      fundGroup, (p) => p.institution.replace(/ \(.*?\)/g, ""),
      (p) => `${esc(progName(p))}<br>Duration: ${p.years ? p.years + " years full time" : "not stated"}<br>Total credits: ${p.total_credits ?? "not stated"} (local units)<br>General education: ${p.gen_ed_credits ?? "not stated"} credits, as the institution counts it<br>Local fee: ${hkd(p.fee_local) || "not stated"} a year<br>Accreditation stated: ${esc(p.accreditation || "not stated")}`,
      (p) => `${fundGroup(p)}, local fee ${hkd(p.fee_local) || "not stated"} a year`, 13),
      { map: { style: "carto-positron", center: { lat: 22.36, lon: 114.13 }, zoom: 9.7 }, margin: { l: 0, r: 0, t: 0, b: 0 }, showlegend: true, legend: { orientation: "h", x: 0, y: 1, bgcolor: "rgba(255,255,255,.85)" } });
    onPick("hk-map", P, card, (p) => p.institution.replace(/ \(.*?\)/g, ""));
    const short = (p) => `${p.institution.replace(/ \(.*?\)/g, "").replace("The ", "")}: ${p.program.replace(/Bachelor of (Science|Engineering) (\(Hons\) |\(Honours\) |with Honours )?in /, "").replace(/ \(.*\)/, "")}`;
    compChart("hk-comp", P, short);
    if (R) {
      const parts = [["added_common_core", "Common Core (general education)", "#EAD1DC"], ["added_language", "English and Chinese", "#D9EAD3"], ["added_professional", "the profession", "#BFBFBF"]];
      plot("hk-reform", parts.map(([kk, lab, col]) => ({ type: "bar", orientation: "h", name: lab, y: ["60 credits added"], x: [R[kk]], marker: { color: col, line: { color: "#333", width: .5 } },
        text: [`${R[kk]}`], textposition: "inside", hovertemplate: `${lab[0].toUpperCase() + lab.slice(1)}: ${R[kk]} of the ${R.added_credits} credits added<extra></extra>` })),
        { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.5 }, margin: { l: 120, r: 14, t: 6, b: 50 }, xaxis: { range: [0, R.added_credits], title: { text: "credits" } } });
      $("hk-reform-text").innerHTML = `The University of Hong Kong’s BSc in Surveying required ${R.three_year_credits} credits in three years before the reform and ${R.four_year_credits} in four after it. Of the ${R.added_credits} credits added, ${R.added_common_core} went to the Common Core, ${R.added_language} to English and Chinese and ${R.added_professional} to the profession: a little over half of the added year went to breadth and language.`;
    }
    table("hk-atlas-table", [
      { key: "institution", label: "Institution", tip: "The institution that awards the degree." },
      { key: "program", label: "Program", fmt: (v, r) => `${esc(v)}`, tip: "Programme title as the institution states it." },
      { key: "funding", label: "Funding", tip: "UGC-funded (government-funded places) or self-financing." },
      { key: "years", label: "Full-time years", num: true, tip: "Normal length of the full-time degree." },
      { key: "total_credits", label: "Total credits (local units)", num: true, tip: "Total credits the degree requires in the institution’s own units; units differ between institutions." },
      { key: "gen_ed_credits", label: "General education credits", num: true, tip: "General education as the institution counts it (common core, cluster areas, university requirements); the definition is in the program card." },
      { key: "major_credits", label: "Major credits", num: true, tip: "Credits of the major or professional core as the institution counts them." },
      { key: "fee_local", label: "Local fee a year (Hong Kong dollars)", num: true, fmt: hkd, tip: "Annual tuition fee for local students, as published for the year shown in the program card." },
      { key: "accreditation", label: "Accreditation stated", tip: "Professional bodies the programme names: HKIS (Hong Kong Institute of Surveyors), RICS, CIOB, HKIE (Hong Kong Institution of Engineers), HKICM and others." },
      { key: "url", label: "Sources", fmt: (v, r) => [link(v, "programme page"), link(r.curriculum_url, "curriculum")].filter(Boolean).join(" "), tip: "Links to the programme page and the curriculum document read for this atlas." },
    ], P, { onRow: card, sortKey: "institution" });
    function card(p) {
      const cs = p.courses || [];
      const years = Array.from(new Set(cs.map((m) => m[0]))).sort();
      openCard(`<h2>${esc(p.institution)}</h2><div class="muted">${esc(progName(p))}</div>
        <div class="links">${link(p.url, "Programme page")}${link(p.curriculum_url, "Curriculum document")}</div>
        <dl><dt>Department</dt><dd>${esc(p.department)}</dd><dt>Funding</dt><dd>${esc(p.funding)}</dd><dt>JUPAS code</dt><dd>${esc(p.jupas || "not stated")}</dd>
          <dt>Duration</dt><dd>${p.years} years full time</dd><dt>Credit system</dt><dd>${esc(p.credit_system)}</dd>
          <dt>Total credits</dt><dd>${p.total_credits ?? "not stated"}</dd><dt>General education</dt><dd>${p.gen_ed_credits ?? "not stated"} credits: ${esc(p.gen_ed_definition)}</dd>
          <dt>Major</dt><dd>${p.major_credits ?? "not stated"} credits${p.major_definition ? `: ${esc(p.major_definition)}` : ""}</dd>
          <dt>Work-integrated learning</dt><dd>${esc(p.wie || "not stated")}</dd><dt>Accreditation stated</dt><dd>${esc(p.accreditation)}</dd>
          <dt>Local fee</dt><dd>${hkd(p.fee_local) || "not stated"} a year${p.fee_local_year ? ` (${esc(p.fee_local_year)})` : ""}${p.fee_local_note ? `; ${esc(p.fee_local_note)}` : ""}</dd><dt>Non-local fee</dt><dd>${hkd(p.fee_nonlocal) || "not stated"} a year</dd>
          <dt>Curriculum year</dt><dd>${esc(p.curriculum_year)}</dd><dt>Read on</dt><dd>${esc(p.read_on)}</dd></dl>
        ${p.history ? `<h4>Before and after the 2012 reform</h4><p class="muted">${esc(p.history)}</p>` : ""}
        ${cs.length ? years.map((y) => `<h4>${esc(yearLabel(y))}</h4><table class="data"><thead><tr><th>Course</th><th class="n">Credits</th><th>Type</th><th>Note</th></tr></thead><tbody>${cs.filter((m) => m[0] === y).map((m) => `<tr><td>${esc((m[1] ? m[1] + " " : "") + m[2])}</td><td class="n">${m[3] ?? ""}</td><td>${esc(m[4] || "")}</td><td>${esc(m[5] || "")}</td></tr>`).join("")}</tbody></table>`).join("") : `<p class="muted">No course list was published.</p>`}
        <p class="note">Map point: ${esc(p.place || "not located")} (OpenStreetMap).</p>`);
    }
  }
  return { uk, hk };
})();
