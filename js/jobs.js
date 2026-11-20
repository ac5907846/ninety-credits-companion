/* Jobs: the postings read from employers' career sites on the collection date (data/jobs.json, built by build_jobs.py from
   Modules 20 and 25). Every row keeps the address it was read from; the record of a posting names its posting, the
   employer's career site, the career-site system and the public list that named the employer. No posting text is shown.
   A university capital projects office appears without its name, titles and addresses (no university is named outside
   the atlases). */
window.Jobs = (function () {
  const { load, $, esc, n, money, median, plot } = window.U;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const SETS = [["all", "All unique U.S. postings", 0], ["entry", "Entry level", 1], ["analysis", "Entry-level construction management roles (analysis set)", 2]];
  // levels in the order of seniority for the chips, the chart and its key; the data keeps the order of the rules
  const LEVEL_ORDER = ["L_ENTRY_TITLE", "L_ENTRY_EXP", "L_0_3", "L_4_7", "L_8_UP", "L_SENIOR", "L_NA"];
  const LEVEL_FILL = { L_ENTRY_TITLE: "#0072B2", L_ENTRY_EXP: "#56B4E9", L_0_3: "#009E73", L_4_7: "#F0E442", L_8_UP: "#E69F00", L_SENIOR: "#D55E00", L_NA: "#BDBDBD" };
  const PAGE = 50;
  const WITHHELD = "Title withheld";
  let D = null, R = [], sel = null, sort = { key: "rank", dir: 1 }, page = 0, timer = null;
  const fresh = () => ({ set: "all", levels: new Set(), types: new Set(), role: "", state: "", q: "" });

  const dateText = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const payText = (r) => (r.pay_low == null ? "" : r.pay_high != null && r.pay_high !== r.pay_low ? `${money(r.pay_low)} to ${money(r.pay_high)}` : money(r.pay_low));
  const link = (u, lab) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(lab || u)}</a>` : "");
  /* a posting closes; the Internet Archive may hold a copy of its address. The link asks it for the copy nearest the day of reading. */
  const archived = (u) => (u ? `https://web.archive.org/web/${D.collected_iso.replace(/-/g, "")}/${u}` : "");

  function filtered() {
    const q = sel.q.trim().toLowerCase(), min = SETS.find((s) => s[0] === sel.set)[2];
    return R.filter((r) => r.set >= min && (!sel.levels.size || sel.levels.has(r.levelId)) && (!sel.types.size || sel.types.has(r.type))
      && (!sel.role || r.roleId === sel.role) && (!sel.state || r.state === sel.state) && (!q || r.hay.includes(q)));
  }

  function chips(el, values, onPick, isOn) {
    $(el).innerHTML = values.map(([v, lab, col]) => `<span class="chip${isOn(v) ? " on" : ""}" data-v="${esc(v)}">${col ? `<span class="dot" style="background:${col}"></span>` : ""}${esc(lab)}</span>`).join("");
    $(el).querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { onPick(c.dataset.v); bind(); update(); }));
  }
  function bind() {
    const S = D.summary, count = { all: S.unique, entry: S.entry, analysis: S.analysis };
    chips("j-set", SETS.map(([v, lab]) => [v, `${lab}, ${n(count[v])}`]), (v) => { sel.set = v; }, (v) => sel.set === v);
    chips("j-level", LEVEL_ORDER.map((id) => [id, D.levels.find((l) => l.id === id).label, LEVEL_FILL[id]]), (v) => { sel.levels.has(v) ? sel.levels.delete(v) : sel.levels.add(v); }, (v) => sel.levels.has(v));
    chips("j-type", D.types.map((t) => [t, t]), (v) => { sel.types.has(v) ? sel.types.delete(v) : sel.types.add(v); }, (v) => sel.types.has(v));
    $("j-role").value = sel.role; $("j-state").value = sel.state;
  }

  function tiles(F) {
    const paid = F.filter((r) => r.pay_low != null);
    const days = median(F.map((r) => r.days));
    const lo = median(paid.map((r) => r.pay_low)), hi = median(paid.map((r) => (r.pay_high != null ? r.pay_high : r.pay_low)));
    const t = [
      [n(F.length), "postings shown"],
      [n(new Set(F.map((r) => r.employer)).size), "employers"],
      [n(new Set(F.map((r) => r.state).filter(Boolean)).size), "states and territories named"],
      [days == null ? "" : n(days, 1), `median days since posted (${n(F.filter((r) => r.days != null).length)} give a date)`],
      [F.length ? Math.round(100 * paid.length / F.length) + "%" : "", `state their pay (${n(paid.length)} postings)`],
      [lo == null ? "" : `${money(lo)} to ${money(hi)}`, "median stated pay, low and high end, as a yearly amount"],
    ];
    $("j-tiles").innerHTML = t.map(([v, k]) => `<div class="tile"><div class="v">${v || "n/a"}</div><div class="k">${k}</div></div>`).join("");
  }

  function map(F) {
    const by = {};
    F.forEach((r) => { if (r.state) by[r.state] = (by[r.state] || 0) + 1; });
    const st = Object.keys(by).sort(), none = F.filter((r) => !r.state).length;
    plot("j-map", [{ type: "choropleth", locationmode: "USA-states", locations: st, z: st.map((s) => by[s]), zmin: 0,
      colorscale: [[0, "#F7FBFF"], [.15, "#C6DBEF"], [.4, "#6BAED6"], [.7, "#2171B5"], [1, "#08306B"]], marker: { line: { color: "#7a7a7a", width: .6 } },
      colorbar: { title: { text: "postings", side: "right" }, thickness: 12, len: .7, outlinewidth: 0 },
      text: st.map((s) => `<b>${esc(s)}</b><br>${n(by[s])} postings`), hovertemplate: "%{text}<extra></extra>" }],
    { geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "white" }, margin: { l: 0, r: 0, t: 0, b: 0 } });
    $("j-map-note").textContent = [none ? `${n(none)} postings shown name no state` : "", by.PR ? `${n(by.PR)} in Puerto Rico` : ""].filter(Boolean).join("; ") + (none || by.PR ? "; these are not on the map." : "");
    const el = $("j-map");
    el.removeAllListeners && el.removeAllListeners("plotly_click");
    el.on("plotly_click", (e) => { const s = e.points[0].location; sel.state = sel.state === s ? "" : s; bind(); update(); });
  }

  function roleChart(F) {
    const roles = D.roles.slice().reverse();
    const tr = LEVEL_ORDER.map((id) => { const lab = D.levels.find((l) => l.id === id).label;
      return { type: "bar", orientation: "h", name: lab, y: roles.map((r) => r.label), x: roles.map((r) => F.filter((p) => p.roleId === r.id && p.levelId === id).length),
        customdata: roles.map((r) => r.id), marker: { color: LEVEL_FILL[id], line: { color: "#333", width: .4 } }, hovertemplate: `%{y}<br>${esc(lab)}: %{x:,} postings<extra></extra>` }; });
    plot("j-roles", tr, { barmode: "stack", margin: { l: 10, r: 14, t: 6, b: 40 }, xaxis: { title: { text: "postings" } }, yaxis: { automargin: true, tickfont: { size: 11.5 }, ticksuffix: " " },
      showlegend: false });   // the Level chips above carry the colors
    const el = $("j-roles");
    el.removeAllListeners && el.removeAllListeners("plotly_click");
    el.on("plotly_click", (e) => { const id = e.points[0].customdata; sel.role = sel.role === id ? "" : id; bind(); update(); });
  }

  const HEAD = [
    { key: "title", label: "Job title", tip: "The title as the career site gave it. It links to the address the posting was read from; the posting may have closed since." },
    { key: "employerName", label: "Employer", tip: "The employer whose career site carried the posting, as the public list names it." },
    { key: "state", label: "State", tip: "State of the job location, as a two-letter postal code. Blank where the posting names none." },
    { key: "role", label: "Role family", tip: "Role family read from the title by written rules; the analysis set keeps the role its codebook gave it." },
    { key: "levelRank", label: "Level", tip: "Entry level by title or by experience and degree; otherwise a senior title; otherwise the lowest years of experience the text asks." },
    { key: "posted", label: "Posted", tip: "The date the career-site system gives. Blank where it gives none." },
    { key: "days", label: "Days since posted", num: true, tip: "Days from the posting date to the day the posting was read." },
    { key: "pay_low", label: "Stated pay, yearly", num: true, tip: "Pay as the posting states it, read by written rules; an hourly rate is multiplied by 2,080 hours and a monthly amount by 12. Blank where the posting states none." },
    { key: "system", label: "Career-site system", tip: "The system the employer’s career site runs on, through which the posting was read." },
    { key: "read", label: "Read, UTC", tip: "The time of day, in UTC, at which the posting was read on the day of collection. The study keeps the copy read at that moment." },
    { key: "url", label: "Archived copy", nosort: true, tip: "A search of the Internet Archive for a copy of the posting’s address, for a posting that has closed. A copy exists only where the Archive saved one." },
  ];
  function tbl(F) {
    const h = HEAD.find((x) => x.key === sort.key) || { num: true };   // "rank": the analysis set, then entry level, then the rest, the most recent first
    const d = F.slice().sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null || x === "") return 1; if (y == null || y === "") return -1;
      return (h.num || typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
    });
    const pages = Math.max(1, Math.ceil(d.length / PAGE));
    page = Math.min(page, pages - 1);
    const view = d.slice(page * PAGE, (page + 1) * PAGE);
    $("j-count").textContent = `(${n(F.length)} shown)`;
    const th = HEAD.map((x) => `<th data-k="${x.key}" class="${x.num ? "n" : ""} tip ${sort.key === x.key ? (sort.dir > 0 ? "asc" : "desc") : ""}" data-tip="${esc(x.tip)}">${x.label}</th>`).join("");
    const tb = view.map((r) => `<tr class="click" data-i="${r.i}"><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : `<span class="muted">${esc(r.title || WITHHELD)}</span>`}${r.set === 2 ? ' <span class="tag set">analysis set</span>' : ""}</td>
      <td>${esc(r.employerName)}</td><td>${esc(r.state)}</td><td>${esc(r.role)}</td><td>${esc(r.level)}</td><td>${esc(dateText(r.posted))}</td><td class="n">${r.days == null ? "" : n(r.days)}</td><td class="n">${payText(r)}</td><td>${esc(r.system)}</td><td>${esc(r.read)}</td><td>${r.url ? `<a href="${esc(archived(r.url))}" target="_blank" rel="noopener">look up</a>` : ""}</td></tr>`).join("");
    const t = $("j-table");
    t.innerHTML = `<thead><tr>${th}</tr></thead><tbody>${tb}</tbody>`;
    t.querySelectorAll("th").forEach((x) => x.addEventListener("click", () => { const k = x.dataset.k; if (HEAD.find((c) => c.key === k).nosort) return; sort = { key: k, dir: sort.key === k ? -sort.dir : 1 }; page = 0; tbl(filtered()); }));
    t.querySelectorAll("tbody tr").forEach((x) => x.addEventListener("click", (e) => { if (e.target.closest("a")) return; card(R[Number(x.dataset.i)]); }));
    $("j-pager").innerHTML = `<button type="button" class="reset" id="j-prev"${page ? "" : " disabled"}>Previous</button>
      <span>${d.length ? `${n(page * PAGE + 1)} to ${n(Math.min(d.length, (page + 1) * PAGE))} of ${n(d.length)}` : "no posting matches"}</span>
      <button type="button" class="reset" id="j-next"${page < pages - 1 ? "" : " disabled"}>Next</button>`;
    $("j-prev").onclick = () => { page--; tbl(filtered()); };
    $("j-next").onclick = () => { page++; tbl(filtered()); };
  }

  function card(r) {
    const e = D.employers[r.employer], L = D.lists[e.list], lev = D.levels.find((l) => l.id === r.levelId), role = D.roles.find((x) => x.id === r.roleId);
    const held = "withheld: no university is named outside the atlases";
    $("card").innerHTML = `<button class="close" id="card-close" type="button">Close</button>
      <h2>${esc(r.title || WITHHELD)}</h2><div class="muted">${esc(e.name)}${r.state ? ", " + esc(r.state) : ""}; ${esc(e.type.toLowerCase())}</div>
      <h4>Source of this record</h4><dl>
        <dt>Posting, as read</dt><dd>${r.url ? link(r.url) : held}</dd>
        <dt>Read on</dt><dd>${esc(D.collected)} at ${esc(r.read)} UTC; the posting may have closed since</dd>
        <dt>If the posting has closed</dt><dd>${r.url ? link(archived(r.url), "search the Internet Archive for a copy of this address") : held}</dd>
        <dt>SHA-256 of the copy the study keeps</dt><dd id="card-print" style="word-break:break-all">loading…</dd>
        <dt>Record number</dt><dd>${r.id ? esc(r.id) : held}</dd>
        <dt>Career-site system</dt><dd>${esc(r.system)}</dd>
        <dt>Employer’s career site</dt><dd>${e.careers ? link(e.careers) : held}</dd>
        <dt>Public list that names the employer</dt><dd>${link(L.url, L.list)}</dd></dl>
      <h4>Coded fields</h4><dl>
        <dt>Role family</dt><dd>${esc(role.label)}; ${esc(role.group.toLowerCase())}</dd>
        <dt>Level</dt><dd>${esc(lev.label)}; ${esc(lev.rule)}</dd>
        <dt>Entry level</dt><dd>${r.set >= 1 ? "yes" : "no"}</dd>
        <dt>Analysis set</dt><dd>${r.set === 2 ? "yes, an entry-level construction management role" : "no"}</dd>
        <dt>Posted</dt><dd>${r.posted ? `${esc(dateText(r.posted))}; ${n(r.days)} days before it was read` : "date not given"}</dd>
        <dt>Stated pay, as a yearly amount</dt><dd>${payText(r) || "not stated"}</dd></dl>
      <p class="note">The study keeps the copy of the posting read at that time; the fingerprint identifies that copy, so the record can be checked after the posting closes. The site shows the title, the employer, the state, the dates and the coded fields, not the text of the posting.</p>`;
    load("jobs_fingerprints").then((F) => { const el = $("card-print"); if (el) el.textContent = F.rows[r.i]; }).catch(() => { const el = $("card-print"); if (el) el.textContent = "not loaded"; });
    $("card-back").hidden = false;
    $("card-close").onclick = () => { $("card-back").hidden = true; };
  }

  function sourceTables() {
    const num = (v) => (v == null ? "" : n(v));
    $("j-lists").innerHTML = `<thead><tr><th>Public list</th><th class="n">Employers in the frame</th><th class="n">Career sites read</th><th class="n">With postings</th><th class="n">Unique postings</th><th class="n">Entry level</th><th class="n">Analysis set</th></tr></thead><tbody>` +
      D.lists.map((l) => `<tr><td>${link(l.url, l.list)}</td><td class="n">${num(l.in_frame)}</td><td class="n">${num(l.read)}</td><td class="n">${num(l.with_postings)}</td><td class="n">${num(l.unique)}</td><td class="n">${num(l.entry)}</td><td class="n">${num(l.analysis)}</td></tr>`).join("") + "</tbody>";
    let group = "";
    $("j-systems").innerHTML = `<thead><tr><th>Career-site system</th><th class="n">Employers</th><th class="n">With postings</th><th class="n">Postings listed</th><th class="n">Read in full</th><th class="n">Unique U.S. postings</th><th class="n">Entry level</th><th class="n">Analysis set</th></tr></thead><tbody>` +
      D.systems_table.map((s) => { const g = s.group !== group ? `<tr class="group"><td colspan="8">${esc(s.group)}</td></tr>` : ""; group = s.group;
        return g + `<tr><td>${esc(s.system)}</td><td class="n">${num(s.employers)}</td><td class="n">${num(s.with_postings)}</td><td class="n">${num(s.listed)}</td><td class="n">${num(s.fetched)}</td><td class="n">${num(s.unique)}</td><td class="n">${num(s.entry)}</td><td class="n">${num(s.analysis)}</td></tr>`; }).join("") + "</tbody>";
  }

  /* the postings shown, as a file: every field of the table and of the record, with the fingerprint of the saved copy */
  async function download() {
    const F = filtered(), P = await load("jobs_fingerprints");
    const cell = (v) => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ["job_title", "employer", "employer_type", "state", "role_family", "level", "entry_level", "analysis_set", "posted", "days_since_posted", "pay_low_yearly_usd", "pay_high_yearly_usd",
      "career_site_system", "posting_address", "read_utc", "sha256_of_saved_copy", "internet_archive_search", "record_number", "employer_career_site", "public_list", "public_list_address"];
    const lines = F.map((r) => { const e = D.employers[r.employer], L = D.lists[e.list];
      return [r.title || WITHHELD, e.name, e.type, r.state, r.role, r.level, r.set >= 1 ? "yes" : "no", r.set === 2 ? "yes" : "no", r.posted, r.days, r.pay_low, r.pay_high, r.system, r.url,
        `${D.collected_iso}T${r.read}Z`, P.rows[r.i], archived(r.url), r.id, e.careers, L.list, L.url].map(cell).join(","); });
    const blob = new Blob(["﻿" + head.join(",") + "\r\n" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `job_postings_read_${D.collected_iso}_${F.length}_rows.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function update() { page = 0; const F = filtered(); tiles(F); map(F); roleChart(F); tbl(F); }

  async function init() {
    D = await load("jobs");
    const C = D.columns, ix = Object.fromEntries(C.map((c, i) => [c, i]));
    const rank = Object.fromEntries(LEVEL_ORDER.map((id, i) => [id, i]));
    R = D.rows.map((a, i) => { const e = D.employers[a[ix.employer]], role = D.roles[a[ix.role]], lev = D.levels[a[ix.level]];
      return { i, title: a[ix.title], employer: a[ix.employer], employerName: e.name, type: e.type, state: a[ix.state], roleId: role.id, role: role.label, levelId: lev.id, level: lev.label,
        levelRank: rank[lev.id], posted: a[ix.posted], days: a[ix.days], pay_low: a[ix.pay_low], pay_high: a[ix.pay_high], set: a[ix.set], system: D.systems[a[ix.system]], url: a[ix.url], id: a[ix.id], read: a[ix.read],
        rank: (2 - a[ix.set]) * 1e6 + (a[ix.days] == null ? 99999 : a[ix.days]), hay: `${a[ix.title]} ${e.name}`.toLowerCase() }; });
    sel = fresh();
    const S = D.summary;
    $("jobs-lede").textContent = `${n(S.frame_employers)} employers named on ${n(D.lists.length)} public lists; the career sites of ${n(S.employers_read)} were read on ${D.collected} and ${n(S.employers_with_postings)} carried postings: ${n(S.unique)} unique U.S. postings, ${n(S.entry)} of them entry level and ${n(S.analysis)} entry-level construction management roles.`;
    let g = "";
    $("j-role").innerHTML = '<option value="">All role families</option>' + D.roles.map((r) => { const open = r.group !== g ? `${g ? "</optgroup>" : ""}<optgroup label="${esc(r.group)}">` : ""; g = r.group; return `${open}<option value="${r.id}">${esc(r.label)}</option>`; }).join("") + "</optgroup>";
    $("j-state").innerHTML = '<option value="">All states</option>' + Array.from(new Set(R.map((r) => r.state).filter(Boolean))).sort().map((s) => `<option value="${s}">${s}</option>`).join("");
    $("j-role").onchange = (e) => { sel.role = e.target.value; update(); };
    $("j-state").onchange = (e) => { sel.state = e.target.value; update(); };
    $("j-q").oninput = (e) => { clearTimeout(timer); const v = e.target.value; timer = setTimeout(() => { sel.q = v; update(); }, 180); };
    $("j-reset").onclick = () => { sel = fresh(); $("j-q").value = ""; sort = { key: "rank", dir: 1 }; bind(); update(); };
    $("j-csv").onclick = () => { download().catch((e) => console.error(e)); };
    $("j-note").textContent = `Postings read once, on ${D.collected}, from the employers’ own career sites. A posting closes, so each record holds what outlasts it: the address read, the time of reading, the SHA-256 fingerprint of the copy the study keeps, and a search of the Internet Archive for that address, beside the employer’s career site, the career-site system and the public list that names the employer. Each title links to the address as read; each row opens its record. ${n(D.masked_postings)} postings of ${n(D.masked_employers)} university capital projects offices appear without their titles and addresses, because no university is named outside the atlases.`;
    sourceTables();
    bind();
    update();
  }
  return { init };
})();
