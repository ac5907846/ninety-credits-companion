/* Hash router: one view at a time; each view builds once, on first visit. Old hashes of the earlier site lead to the
   views that replaced them. */
(function () {
  const both = (a, b) => () => Promise.all([Promise.resolve(a()), Promise.resolve(b())]);
  const VIEWS = { atlas: both(() => window.Atlas.init(), window.Paper.atlas), uk: window.World.uk, hk: window.World.hk,
    holders: both(window.Model.holders, window.Views.rules), ledger: both(window.Views.ledger, window.Paper.ledger), routes: window.Model.routes,
    ai: both(window.Deep.ai, window.Paper.ai), abroad: window.Views.abroad, strategies: window.Deep.strategies, sources: window.Views.sources };
  const ALIAS = { rules: "holders", removes: "routes" };
  const built = {};
  function show() {
    let name = (location.hash || "#atlas").slice(1);
    if (ALIAS[name]) name = ALIAS[name];
    const v = VIEWS[name] ? name : "atlas";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
    if (!built[v]) { built[v] = true; Promise.resolve(VIEWS[v]()).catch((e) => { console.error(e); }); }
    else window.dispatchEvent(new Event("resize"));
  }
  window.addEventListener("hashchange", show);
  show();
})();
