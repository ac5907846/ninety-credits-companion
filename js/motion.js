/* Motion helpers: easing, a frame loop with a timer fallback, count-ups that carry from their previous value, and the reduced-motion flag. */
window.M = (function () {
  "use strict";
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const raf = (fn) => (window.requestAnimationFrame ? window.requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 16));
  const now = () => (window.performance ? performance.now() : Date.now());

  // run fn(progress 0..1) over ms milliseconds; returns a handle with cancel()
  function tween(ms, fn, ease = easeInOut, done) {
    if (reduced || ms <= 0) { fn(1); if (done) done(); return { cancel() {} }; }
    let cancelled = false, fallback = null;
    const t0 = now();
    const step = () => {
      if (cancelled) return;
      const p = Math.min(1, (now() - t0) / ms);
      fn(ease(p));
      if (p < 1) { raf(step); fallback = setTimeout(() => { if (!cancelled && now() - t0 >= ms) { fn(1); } }, ms + 50); }
      else if (done) done();
    };
    raf(step);
    return { cancel() { cancelled = true; if (fallback) clearTimeout(fallback); } };
  }

  // a number that counts from its last shown value to a new one; the element remembers where it is
  const running = new WeakMap();
  function count(el, to, fmt = (v) => Math.round(v).toLocaleString("en-US"), ms = 900) {
    if (to == null || isNaN(to)) { el.textContent = fmt(to); return; }
    const from = el._mvalue == null ? to : el._mvalue;
    const prev = running.get(el);
    if (prev) prev.cancel();
    const h = tween(ms, (p) => { const v = from + (to - from) * p; el._mvalue = v; el.textContent = fmt(v); }, easeOut, () => { el._mvalue = to; el.textContent = fmt(to); });
    running.set(el, h);
  }
  function snapshot(el) { return el._mvalue; }
  function carry(el, v) { el._mvalue = v; }
  return { reduced, easeInOut, easeOut, tween, count, snapshot, carry, now };
})();
