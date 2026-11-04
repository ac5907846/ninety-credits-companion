/* A tour steps a figure through its states on a clock. It keeps running through scrolling, key presses and clicks elsewhere;
   it stops only when the reader presses its Pause pill or clicks inside the figure itself, and only Play starts it again.
   The clock waits while the figure or the page is hidden. Choosing a state with the figure's own buttons does not stop it. */
window.Tour = function (opts) {
  "use strict";
  const { host, steps, show, every = 4500, label = "tour", autoplay = true, stopOn = null } = opts;
  let i = -1, playing = false, timer = null, visible = true, pageVisible = !document.hidden, remaining = every, lastTick = 0;
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "tour-pill";
  pill.setAttribute("aria-label", "Play or pause the " + label);
  host.appendChild(pill);
  const setPill = () => { pill.textContent = playing ? "Pause" : "Play"; pill.classList.toggle("on", playing); };

  function go(k, cause) {
    i = ((k % steps) + steps) % steps;
    show(i, cause);
    remaining = every;
    lastTick = M.now();
  }
  function tick() {
    if (!playing) return;
    if (!visible || !pageVisible) { timer = setTimeout(tick, 250); return; }
    const t = M.now();
    remaining -= Math.min(t - lastTick, 1000);
    lastTick = t;
    if (remaining <= 0) go(i + 1, "tour");
    timer = setTimeout(tick, 100);
  }
  function play() { if (playing) return; playing = true; lastTick = M.now(); setPill(); tick(); }
  function pause() { playing = false; if (timer) clearTimeout(timer); timer = null; setPill(); }
  pill.addEventListener("click", (e) => { e.stopPropagation(); playing ? pause() : play(); });
  // a click inside the figure stops the tour; the pill and the figure's own step buttons are exempt
  host.addEventListener("click", (e) => {
    if (e.target.closest(".tour-pill") || e.target.closest(".tour-keep")) return;
    if (stopOn && !e.target.closest(stopOn)) return;
    if (playing) pause();
  });
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); }, { threshold: 0.05 }).observe(host);
  document.addEventListener("visibilitychange", () => { pageVisible = !document.hidden; });
  go(0, "init");
  if (autoplay && !M.reduced) play(); else setPill();
  return { go: (k) => go(k, "button"), play, pause, index: () => i, playing: () => playing };
};
