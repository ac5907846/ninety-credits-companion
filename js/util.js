/* Shared helpers: data loading, formatting, sortable tables, the article's tables, Plotly defaults. */
window.U = (function () {
  const V = 15;
  const cache = {};
  function load(name) {
    if (!cache[name]) cache[name] = fetch(`data/${name}.json?v=${V}`).then((r) => { if (!r.ok) throw new Error(name); return r.json(); });
    return cache[name];
  }
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  /* the article's inline markup: **bold**, *italic*; links stay text */
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  const isNum = (v) => typeof v === "number" && isFinite(v);
  function n(v, d = 0) { if (v === "" || v == null) return ""; const x = Number(v); return isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 }) : esc(v); }
  function money(v) { if (v === "" || v == null || !isFinite(Number(v))) return ""; const x = Number(v); return (x < 0 ? "−$" : "$") + Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
  function share(v, d = 0) { if (v === "" || v == null || !isFinite(Number(v))) return ""; return (100 * Number(v)).toFixed(d) + "%"; }
  function dec(v, d = 2) { if (v === "" || v == null || !isFinite(Number(v))) return ""; const s = Number(v).toFixed(d); return s.replace(/^0\./, ".").replace(/^-0\./, "−."); }
  function median(a) { const v = a.filter(isNum).sort((x, y) => x - y); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
  function rows(obj) { return obj.rows.map((r) => Object.fromEntries(obj.columns.map((c, i) => [c, r[i]]))); }
  /* table: head = [{key,label,num,fmt,tip}], data = array of objects; opts.onRow, opts.sortKey */
  function table(el, head, data, opts = {}) {
    const t = typeof el === "string" ? $(el) : el;
    let sortKey = opts.sortKey || null, dir = opts.dir || 1;
    function render() {
      let d = data.slice();
      if (sortKey) {
        const h = head.find((x) => x.key === sortKey);
        d.sort((a, b) => {
          const x = a[sortKey], y = b[sortKey];
          if (x == null || x === "") return 1; if (y == null || y === "") return -1;
          return (h && h.num ? (Number(x) - Number(y)) : String(x).localeCompare(String(y))) * dir;
        });
      }
      const th = head.map((h) => `<th data-k="${h.key}" class="${h.num ? "n" : ""} ${h.tip ? "tip" : ""} ${sortKey === h.key ? (dir > 0 ? "asc" : "desc") : ""}"${h.tip ? ` data-tip="${esc(h.tip)}"` : ""}>${h.label}</th>`).join("");
      const tb = d.map((r) => `<tr class="${opts.onRow ? "click" : ""}" data-i="${data.indexOf(r)}">` + head.map((h) => `<td class="${h.num ? "n" : ""}">${h.fmt ? h.fmt(r[h.key], r) : esc(r[h.key])}</td>`).join("") + "</tr>").join("");
      t.innerHTML = `<thead><tr>${th}</tr></thead><tbody>${tb}</tbody>`;
      if (t.classList.contains("sortable")) t.querySelectorAll("th").forEach((x) => x.addEventListener("click", () => { const kk = x.dataset.k; dir = sortKey === kk ? -dir : 1; sortKey = kk; render(); }));
      if (opts.onRow) t.querySelectorAll("tbody tr").forEach((x) => x.addEventListener("click", () => opts.onRow(data[Number(x.dataset.i)])));
    }
    render();
  }
  /* a table of the article as the article prints it. Header cells "<<" join the cell on their left and "^^" the cell
     above, as in the manuscript builder; a row with text in its first cell only is a group heading. */
  const SPAN = "<<", UP = "^^";
  function paperTable(prefix, T) {
    const t = $(prefix + "-table");
    if (!T || !t) return;
    const R = T.rows, ncol = R[0].length;
    let depth = 1;
    while (depth < R.length && (R[depth].includes(UP) || R[depth - 1].includes(SPAN))) depth++;
    let head = "";
    for (let i = 0; i < depth; i++) {
      head += "<tr>";
      for (let j = 0; j < ncol; j++) {
        const c = R[i][j];
        if (c === SPAN || c === UP) continue;
        let cs = 1, rs = 1;
        while (j + cs < ncol && R[i][j + cs] === SPAN) cs++;
        while (i + rs < depth && R[i + rs][j] === UP) rs++;
        const spanner = i < depth - 1 && (cs > 1 || R[i + 1][j] !== UP);
        head += `<th${cs > 1 ? ` colspan="${cs}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""} class="${spanner ? "span" : ""}">${md(c)}</th>`;
      }
      head += "</tr>";
    }
    const body = R.slice(depth).map((r) => {
      const group = r[0] !== "" && r.slice(1).every((c) => c === "");
      return group ? `<tr class="group"><td colspan="${ncol}">${md(r[0])}</td></tr>` : `<tr>${r.map((c) => `<td>${md(c)}</td>`).join("")}</tr>`;
    }).join("");
    t.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
    if ($(prefix + "-title")) $(prefix + "-title").innerHTML = md(T.title).replace(/^(<b>)?(Table S?\d+\.)/, "<b>$2</b>");
    if ($(prefix + "-note")) $(prefix + "-note").innerHTML = md((T.notes || []).join(" "));
  }
  const FONT = { family: "Segoe UI, system-ui, Helvetica, Arial, sans-serif", size: 12, color: "#1f2a37" };
  function plot(id, traces, layout = {}) {
    if (layout.height) { const el = document.getElementById(id); if (el) el.style.height = layout.height + "px"; }  // a computed height must size the box too
    const L = Object.assign({ font: FONT, paper_bgcolor: "white", plot_bgcolor: "white", margin: { l: 50, r: 14, t: 10, b: 40 }, showlegend: false, hoverlabel: { align: "left", font: { size: 12 }, namelength: -1 } }, layout);
    return Plotly.react(id, traces, L, { responsive: true, displaylogo: false, displayModeBar: false });
  }
  /* one tooltip for every element with data-tip: shown at once, follows the pointer, kept inside the window */
  (function tips() {
    const box = document.createElement("div");
    box.id = "tip";
    box.hidden = true;
    document.body.appendChild(box);
    let cur = null;
    function place(e) {
      const pad = 14, w = box.offsetWidth, h = box.offsetHeight;
      let x = e.clientX + pad, y = e.clientY + pad;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
      box.style.left = Math.max(8, x) + "px";
      box.style.top = Math.max(8, y) + "px";
    }
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (el === cur) return;
      cur = el;
      if (!el) { box.hidden = true; return; }
      box.innerHTML = el.dataset.tip.split("\n").map(esc).join("<br>");
      box.hidden = false;
      place(e);
    });
    document.addEventListener("mousemove", (e) => { if (cur) place(e); });
    window.addEventListener("scroll", () => { box.hidden = true; cur = null; }, true);
  })();
  const ACC = [
    ["ACCE", "ACCE", "#0072B2", "acce"], ["ACCE and ABET", "ACCE and ABET ANSAC", "#CC79A7", "both"], ["ABET ANSAC", "ABET ANSAC", "#E69F00", "ansac"],
    ["ACCE applicant or candidate", "ACCE applicant or candidate", "#9ECAE1", "appl"], ["neither", "neither", "#BDBDBD", "none"]];
  const accTag = (g) => { const a = ACC.find((x) => x[0] === g); return a ? `<span class="tag ${a[3]}">${esc(a[1])}</span>` : esc(g); };
  /* Fig. 1a classes: the figure's fills, the institution-defined class hatched */
  const CLASS_FILL = ["#F4DDE9", "#E2AECA", "#CF7FA7", "#FFFFFF"];
  return { load, $, esc, md, n, money, share, dec, median, rows, table, paperTable, plot, ACC, accTag, isNum, CLASS_FILL };
})();
