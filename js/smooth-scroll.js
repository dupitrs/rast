/* Standalone pages share the homepage's scrolling settings. */
(function () {
  'use strict';
  if (!window.Lenis) return;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lenis = null, frame = 0;
  var initialBehavior = document.documentElement.style.scrollBehavior;
  function tick(time) { lenis.raf(time); frame = requestAnimationFrame(tick); }
  function sync() {
    cancelAnimationFrame(frame);
    if (lenis) { lenis.destroy(); lenis = null; }
    document.documentElement.style.scrollBehavior = initialBehavior;
    if (motion.matches) return;
    document.documentElement.style.scrollBehavior = 'auto';
    lenis = new Lenis({ duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true });
    frame = requestAnimationFrame(tick);
  }
  motion.addEventListener('change', sync);
  sync();
})();
