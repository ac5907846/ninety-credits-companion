/* Hash router: one view at a time; each view builds once, on first visit. */
(function () {
  const VIEWS = { atlas: () => window.Atlas.init(), rules: window.Views.rules, abroad: window.Views.abroad, removes: window.Deep.removes, ledger: window.Views.ledger, routes: window.Views.routes, ai: window.Deep.ai, strategies: window.Deep.strategies, sources: window.Views.sources };
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
