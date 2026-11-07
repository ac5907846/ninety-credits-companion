/* Hash router: one view at a time; each view builds once, on first visit. Old hashes of the earlier site lead to the
   views that replaced them. */
(function () {
  const all = (...fns) => () => Promise.all(fns.map((f) => Promise.resolve(f())));
  const VIEWS = { atlas: all(() => window.Atlas.init(), window.Paper.atlas), uk: window.World.uk, hk: window.World.hk,
    satisfy: all(window.Model.holders, window.Views.rules, window.Paths.satisfy), ledger: all(window.Views.ledger, window.Paper.ledger),
    routes: all(window.Model.routes, window.Paths.routes), ai: all(window.Deep.ai, window.Paper.ai, window.Paths.ai), abroad: window.Views.abroad,
    strategies: window.Deep.strategies, sources: window.Views.sources };
  const ALIAS = { holders: "satisfy", rules: "satisfy", removes: "routes" };
  const built = {};
  function show() {
    let name = (location.hash || "#atlas").slice(1);
    if (ALIAS[name]) name = ALIAS[name];
    const v = VIEWS[name] ? name : "atlas";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
    if (!built[v]) { built[v] = true; Promise.resolve(VIEWS[v]()).catch((e) => { console.error(e); }); }
    else { window.dispatchEvent(new Event("resize")); if (v === "satisfy" && window.Paths.redraw) window.Paths.redraw(); }
  }
  window.addEventListener("hashchange", show);
  show();
})();
