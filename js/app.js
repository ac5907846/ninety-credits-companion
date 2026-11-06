/* Hash router: one view at a time; each view builds once, on first visit. */
(function () {
  const both = (a, b) => () => Promise.all([Promise.resolve(a()), Promise.resolve(b())]);
  const VIEWS = { atlas: both(() => window.Atlas.init(), window.Paper.atlas), uk: window.World.uk, hk: window.World.hk, rules: both(window.Views.rules, window.Paper.rules), abroad: window.Views.abroad, removes: window.Deep.removes, ledger: both(window.Views.ledger, window.Paper.ledger), routes: both(window.Views.routes, window.Paper.routes), ai: both(window.Deep.ai, window.Paper.ai), strategies: window.Deep.strategies, sources: window.Views.sources };
  const built = {};
  function show() {
    const name = (location.hash || "#atlas").slice(1);
    const v = VIEWS[name] ? name : "atlas";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
    if (!built[v]) { built[v] = true; Promise.resolve(VIEWS[v]()).catch((e) => { console.error(e); }); }
    else window.dispatchEvent(new Event("resize"));
  }
  window.addEventListener("hashchange", show);
  show();
})();
