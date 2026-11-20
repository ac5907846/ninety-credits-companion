/* The views that are not atlases or job postings (20 November 2026): Requirements, a tile map of the general education
   count each state asks of a reduced-credit bachelor's degree at a public university, each tile opening the state's
   rule and its documents; and About. */
window.Study = (function () {
  const { load, $, esc, md, n, CLASS_FILL } = window.U;

  /* ---------------------------------------------------------------- requirements: one tile per state; a tile opens the
     state's rule and the documents it was read from (data/state_rules.json, built by build_state_rules.py) */
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const classLabel = (c) => String(c.label).replace(/–/g, " to ");
  const shortUrl = (u) => { const s = u.replace(/^https?:\/\/(www\.)?/, ""); return s.length > 78 ? s.slice(0, 75) + "..." : s; };
  const dl = (rows) => `<dl>${rows.filter((x) => x && x[1] !== "" && x[1] != null).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const docs = (L) => (L && L.length ? `<ul class="docs">${L.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(shortUrl(u))}</a></li>`).join("")}</ul>` : "");
  const hours = (v) => `${n(v)} semester hours`;

  /* the panel that slides in from the right; it closes on its button, on the backdrop, on Escape and when the view changes */
  function openCard(html, onClose) {
    const back = $("card-back");
    const close = () => { back.hidden = true; if (onClose) onClose(); };
    $("card").innerHTML = `<button class="close" id="card-close" type="button">Close</button>${html}`;
    back.hidden = false;
    $("card").scrollTop = 0;
    $("card-close").onclick = close;
    back.onclick = (e) => { if (e.target === back) close(); };
    document.onkeydown = (e) => { if (e.key === "Escape" && !back.hidden) close(); };
    window.addEventListener("hashchange", close, { once: true });
  }

  function stateCard(RU, r, c) {
    const a = r.accreditor;
    return `<h2>${esc(r.name)}</h2><div class="muted">${esc(classLabel(c))}${c.none ? ": no count from the state or the institutional accreditor" : ""}</div>
      <h4>General education in a reduced-credit bachelor’s degree at a public university</h4>${dl([
        ["Count", r.count != null ? hours(r.count) : "set by each institution"],
        ["Set by", esc(r.count_from)],
        ["Basis", esc(r.basis)],
        ["State or system minimum", r.state_min != null ? hours(r.state_min) : "none"],
        ["Earlier reading", r.earlier_count != null ? `${hours(r.earlier_count)} on ${esc(RU.read_on.first)}; replaced after the check of ${esc(RU.read_on.check)} by the basis above` : ""],
        ["Major credits counted toward general education", esc(r.overlap_rule)]])}
      <h4>State framework, read on ${esc(RU.read_on.first)}</h4>${dl([
        ["Applies to", esc(r.scope)],
        ["General education framework", esc(r.framework)],
        ["Legal basis", esc(r.legal_basis)],
        ["Rule on total credits", esc(r.credit_rule)],
        ["Citation", esc(r.credit_citation)],
        ["Documents read", docs(r.documents)]])}
      ${a ? `<h4>Institutional accreditor, read on ${esc(RU.read_on.accreditors)}</h4>${dl([
        ["Accreditor", `${esc(a.name)} (${esc(a.short)})`],
        ["General education it asks of a reduced-credit degree", a.min != null ? hours(a.min) : "no count stated"],
        ["Route to approval", esc(a.route)],
        ["Basis", esc(a.basis)]])}` : ""}
      <h4>Action on bachelor’s degrees below 120 credits, verified ${esc(RU.read_on.check)}</h4>${dl([
        ["Status", esc(cap(r.action_label))],
        ["Action", esc(r.action)],
        ["Date", esc(r.action_date)],
        ["Note", esc(r.action_note)],
        ["Documents read", docs(r.action_documents)]])}
      <h4>Construction bachelor’s programs</h4>${dl([
        ["Accredited or applicant programs", `${n(r.programs)}, ${n(r.public)} at public institutions; listed in the <a href="#atlas">U.S. atlas</a>`]])}`;
  }

  async function requirements() {
    const [ST, RU] = await Promise.all([load("states"), load("state_rules")]);
    const C = ST.classes, pos = ST.pos, R = RU.states;
    $("req-lede").textContent = "Each tile gives the state and the semester hours of general education a reduced-credit bachelor’s degree must carry at a public university there. A hatched tile has no count from the state or the institutional accreditor: the institution sets it.";
    const cols = Math.max(...Object.values(pos).map((p) => p[0])) + 1, rowsN = Math.max(...Object.values(pos).map((p) => p[1])) + 1;
    const map = $("req-map");
    map.style.aspectRatio = `${cols} / ${rowsN}`;
    map.innerHTML = Object.entries(pos).map(([st, [x, y]]) => {
      const r = R[st], c = C[r.class];
      const tip = `${r.name}\n${r.count != null ? `${hours(r.count)}, set by ${r.count_from}` : "The institution sets the count"}`;
      return `<div class="st${c.high ? " hi" : ""}${c.none ? " none" : ""}" role="button" tabindex="0" data-st="${st}" data-tip="${esc(tip)}" style="left:${(100 * x / cols).toFixed(3)}%;top:${(100 * y / rowsN).toFixed(3)}%;width:${(100 / cols - .7).toFixed(3)}%;height:${(100 / rowsN - 1).toFixed(3)}%;background:${CLASS_FILL[r.class]}"><b>${esc(st)}</b>${r.count != null ? `<span>${n(r.count)}</span>` : ""}</div>`;
    }).join("");
    /* the key sits in the empty lower right of the grid where the screen is wide enough, under the map otherwise */
    const K0 = [cols - 3, rowsN - 3], free = !Object.values(pos).some(([x, y]) => x >= K0[0] && y >= K0[1]);
    const key = $("req-key");
    key.innerHTML = C.map((c, k) => `<div class="k${c.high ? " strong" : ""}"><span class="sw${c.none ? " none" : ""}${c.high ? " hi" : ""}" style="background:${CLASS_FILL[k]}"></span><span>${esc(classLabel(c))}<br>${esc(c.states)}</span></div>`).join("");
    if (free) { key.classList.add("in"); key.style.left = `${(100 * K0[0] / cols).toFixed(3)}%`; key.style.top = `${(100 * K0[1] / rowsN).toFixed(3)}%`; key.style.width = `${(300 / cols).toFixed(3)}%`; key.style.height = `${(300 / rowsN - 1).toFixed(3)}%`; }
    const open = (t) => {
      const r = R[t.dataset.st];
      map.querySelectorAll(".st.open").forEach((x) => x.classList.remove("open"));
      t.classList.add("open");
      openCard(stateCard(RU, r, C[r.class]), () => t.classList.remove("open"));
    };
    map.querySelectorAll(".st").forEach((t) => {
      t.addEventListener("click", () => open(t));
      t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(t); } });
    });
  }

  /* ---------------------------------------------------------------- about: data sources, references */
  async function about() {
    const D = await load("sources");
    $("refs-list").innerHTML = D.references.map((r) => `<li>${md(r.apa).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u.replace(/\.$/, "")}" target="_blank" rel="noopener">${u}</a>`)}</li>`).join("");
    window.U.table("sources-table", [{ key: "what", label: "Source" }, { key: "date", label: "Read or released" },
      { key: "url", label: "Link", fmt: (v) => (v ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : "linked per item") }],
      D.data.filter((d) => !/Figure S2/.test(d.what)).map((d) => Object.assign({}, d, { what: d.what.replace(" (Table S1; Fig. 1a)", "") })));   // without the article's exhibit numbers and the source of a figure this site no longer shows
  }

  return { requirements, about };
})();
