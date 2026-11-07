/* Hash router: one view at a time; each view builds once, on first visit. Hashes of earlier versions of the site lead
   to the views that replaced them. The Australia atlas shows only when its data file was built. */
window.App = { australia: false };
(function () {
  const VIEWS = { atlas: () => window.Atlas.init(), uk: window.World.uk, hk: window.World.hk, au: window.World.au,
    requirements: window.Study.requirements, integration: window.Study.integration, content: window.Study.content,
    beyond: window.Study.beyond, sources: window.Study.sources };
  const ALIAS = { satisfy: "requirements", holders: "requirements", rules: "requirements", strategies: "requirements",
    routes: "integration", removes: "integration", ledger: "beyond", ai: "beyond", abroad: "beyond" };
  const ATLASES = new Set(["atlas", "uk", "hk", "au"]);
  const built = {};
  function show() {
    let name = (location.hash || "#atlas").slice(1);
    if (ALIAS[name]) name = ALIAS[name];
    let v = VIEWS[name] ? name : "atlas";
    if (v === "au" && !window.App.australia) v = "atlas";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === (ATLASES.has(v) ? "atlas" : v)));
    document.querySelectorAll(".subnav a").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
    if (!built[v]) { built[v] = true; Promise.resolve(VIEWS[v]()).catch((e) => { console.error(e); }); }
    else window.dispatchEvent(new Event("resize"));
  }
  window.U.load("study").then((S) => {
    window.App.australia = !!S.australia;
    document.querySelectorAll('[data-view="au"]').forEach((a) => { a.hidden = !S.australia; });
    document.querySelectorAll(".brand").forEach((b) => { b.textContent = S.short; });
    document.getElementById("foot-title").textContent = S.title;
  }).catch((e) => console.error(e)).then(() => {
    window.addEventListener("hashchange", show);
    show();
  });
})();
