/* The opening picture: the 20 Florida programs on the credit line, moving through the study's stages, with a readout that counts.
   Data: data/hero.json (programs, stages with one credit value per program), written by build_data.py from Modules 15 and 23. */
window.Hero = (function () {
  "use strict";
  const C = { cm: "#E69F00", cv: "#0072B2", green: "#3B7A2A", greenLight: "#E3F0DD", grey: "#9A9A9A", ink: "#1f2a37", muted: "#5b6672", line: "#d9dee3" };
  const STATE_LABEL = { "36": "state keeps 36 general education credits", "36_major12": "state lets 12 major credits count toward general education", "30": "state lowers general education to 30", "21": "state asks only its area minimums (21)", "15": "state asks only the core (15)" };
  const ACC_LABEL = { none: "accreditor unchanged", minus20: "accreditor lowers its numbers by 20%", half: "accreditor halves its numbers", competence: "accreditor counts competence", minus20_competence: "accreditor 20% lower and counts competence", leave: "program leaves accreditation" };
  const AI_LABEL = { none: "no AI saving", F1: "AI tutor revolution", F2: "entry-level squeeze", F3: "AI as an incremental tool", F4: "credential unbundling", F5: "build-out boom", ceiling: "AI ceiling" };
  const MERGE_LABEL = { none: "courses as published", peer_p25: "courses merged as the leanest quarter of accredited programs do" };

  function build(host, data, readout, onStep) {
    const P = data.programs.map((r) => ({ unitid: r[0], short: r[1], field: r[2], published: r[3] }));
    const stages = data.stages;
    const cm = P.map((p, i) => i).filter((i) => P[i].field === "CM"), cv = P.map((p, i) => i).filter((i) => P[i].field === "Civil");
    // fixed row for every program inside its lane, ordered by published total so the picture is stable
    const order = (ix) => ix.slice().sort((a, b) => P[a].published - P[b].published || P[a].short.localeCompare(P[b].short));
    const rowOf = {};
    order(cm).forEach((i, k) => (rowOf[i] = { lane: 0, k }));
    order(cv).forEach((i, k) => (rowOf[i] = { lane: 1, k }));
    const canvas = document.createElement("canvas");
    canvas.className = "hero-canvas";
    host.appendChild(canvas);
    const tip = document.createElement("div");
    tip.className = "hero-tip";
    host.appendChild(tip);
    const ctx = canvas.getContext("2d");
    const cur = P.map((p) => p.published), from = cur.slice();
    let target = cur.slice(), W = 0, H = 0, dpr = 1, geom = null, stage = 0, anim = null, hover = -1;

    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(320, Math.floor(r.width)); H = Math.max(300, Math.floor(r.height));
      dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const left = 24, right = W - 24, top = 44, bottom = H - 38;
      const x = (c) => left + ((c - 40) / (150 - 40)) * (right - left);
      const laneH = (bottom - top) / 2;
      const y = (i) => { const r = rowOf[i]; const n = r.lane === 0 ? cm.length : cv.length; const pad = 22; const step = (laneH - pad - 14) / Math.max(1, n - 1); return top + r.lane * laneH + pad + r.k * step; };
      geom = { left, right, top, bottom, x, y, laneH };
    }
    function draw() {
      if (!geom) layout();
      const { left, right, top, bottom, x, y, laneH } = geom;
      ctx.clearRect(0, 0, W, H);
      // the region at or below 90 credits
      ctx.fillStyle = C.greenLight; ctx.fillRect(left, top - 10, x(90) - left, bottom - top + 10);
      ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x(90), top - 14); ctx.lineTo(x(90), bottom); ctx.stroke();
      ctx.fillStyle = C.green; ctx.font = "600 12px Segoe UI, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("90 credits", x(90), top - 18);
      // axis
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = "11px Segoe UI, system-ui, sans-serif";
      for (let c = 50; c <= 150; c += 10) { ctx.beginPath(); ctx.moveTo(x(c), bottom); ctx.lineTo(x(c), bottom + 4); ctx.stroke(); ctx.fillText(String(c), x(c), bottom + 16); }
      ctx.fillText("Semester credits", (left + right) / 2, bottom + 30);
      // lane titles and the 120 line
      ctx.strokeStyle = C.line; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x(120), top - 10); ctx.lineTo(x(120), bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.fillText("120", x(120), top - 2);
      ctx.textAlign = "left"; ctx.fillStyle = C.ink; ctx.font = "600 12px Segoe UI, system-ui, sans-serif";
      ctx.fillText("Construction management (ACCE), 8 programs", left + 4, top + 6);
      ctx.fillText("Civil engineering (ABET), 12 programs", left + 4, top + laneH + 6);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(left, top + laneH - 4); ctx.lineTo(right, top + laneH - 4); ctx.stroke();
      // programs: published ghost, connector, current mark
      P.forEach((p, i) => {
        const yy = y(i), xp = x(p.published), v = cur[i];
        ctx.strokeStyle = "#cfd5da"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xp, yy - 4); ctx.lineTo(xp, yy + 4); ctx.stroke();
        if (v == null || isNaN(v)) { ctx.fillStyle = C.grey; ctx.font = "10px Segoe UI, system-ui, sans-serif"; ctx.fillText("no feasible plan", xp + 8, yy + 3); return; }
        const xv = x(v);
        ctx.strokeStyle = "#cfd5da"; ctx.beginPath(); ctx.moveTo(Math.min(xp, xv), yy); ctx.lineTo(Math.max(xp, xv), yy); ctx.stroke();
        const col = p.field === "CM" ? C.cm : C.cv, hit = v <= 90;
        ctx.fillStyle = col; ctx.strokeStyle = hit ? C.green : "#1f2a37"; ctx.lineWidth = hit ? 2 : .8;
        if (p.field === "CM") { ctx.fillRect(xv - 5, yy - 5, 10, 10); ctx.strokeRect(xv - 5, yy - 5, 10, 10); }
        else { ctx.beginPath(); ctx.arc(xv, yy, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        if (p.unitid === 433660 || i === hover) {
          ctx.fillStyle = C.ink; ctx.font = (p.unitid === 433660 ? "600 " : "") + "11px Segoe UI, system-ui, sans-serif"; ctx.textAlign = "left";
          ctx.fillText(`${p.short} ${Math.round(v)}`, xv + 9, yy + 4);
        }
      });
    }
    function morph(k, cause) {
      stage = k;
      const s = stages[k];
      from.splice(0, from.length, ...cur);
      target = s.credits.map((v, i) => (v == null ? null : v));
      if (anim) anim.cancel();
      anim = M.tween(cause === "init" ? 0 : 1100, (p) => {
        for (let i = 0; i < cur.length; i++) {
          const a = from[i] == null ? (target[i] == null ? null : P[i].published) : from[i];
          cur[i] = target[i] == null ? (p < 1 ? a : null) : a + (target[i] - a) * p;
        }
        draw();
      });
      counts(s, cause);
      if (onStep) onStep(k, s);
    }
    function reach(s, field) { return P.reduce((n, p, i) => n + (p.field === field && s.credits[i] != null && s.credits[i] <= 90 ? 1 : 0), 0); }
    function median(s, field) { const v = P.map((p, i) => (p.field === field ? s.credits[i] : null)).filter((x) => x != null).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; }
    function sub(s) {
      if (s.sub) return s.sub;
      const parts = [STATE_LABEL[s.state] || s.state, ACC_LABEL[s.accreditor] || s.accreditor, MERGE_LABEL[s.merge] || s.merge, AI_LABEL[s.ai] || s.ai];
      if (s.ai_literacy) parts.push("a required 3-credit AI course");
      if (s.state_rec) parts.push("the state recognizes competence in general education");
      return parts.join("; ") + " (Module 23)";
    }
    function counts(s, cause) {
      const fg = P.findIndex((p) => p.unitid === 433660 && p.field === "CM");
      readout.kicker.textContent = `Step ${stage + 1} of ${stages.length}`;
      readout.title.textContent = s.title;
      readout.sub.textContent = sub(s);
      M.count(readout.cm, reach(s, "CM"), (v) => `${Math.round(v)} of 8`, cause === "init" ? 0 : 900);
      M.count(readout.cv, reach(s, "Civil"), (v) => `${Math.round(v)} of 12`, cause === "init" ? 0 : 900);
      M.count(readout.fgcu, s.credits[fg], (v) => (v == null ? "no plan" : String(Math.round(v))), cause === "init" ? 0 : 900);
      M.count(readout.med, median(s, "CM"), (v) => (v == null ? "" : String(Math.round(v))), cause === "init" ? 0 : 900);
      readout.steps.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === stage));
    }
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      let best = -1, bd = 12;
      P.forEach((p, i) => { if (cur[i] == null) return; const d = Math.hypot(geom.x(cur[i]) - mx, geom.y(i) - my); if (d < bd) { bd = d; best = i; } });
      if (best !== hover) { hover = best; draw(); }
      if (best >= 0) { const p = P[best]; tip.style.display = "block"; tip.style.left = Math.min(mx + 12, W - 220) + "px"; tip.style.top = my + 12 + "px"; tip.innerHTML = `<b>${p.short}</b>, ${p.field === "CM" ? "construction management" : "civil engineering"}<br>published ${Math.round(p.published)} credits; here ${Math.round(cur[best])}`; }
      else tip.style.display = "none";
    });
    canvas.addEventListener("mouseleave", () => { hover = -1; tip.style.display = "none"; draw(); });
    window.addEventListener("resize", () => { layout(); draw(); });
    layout();
    return { morph, stages, draw };
  }
  return { build };
})();
