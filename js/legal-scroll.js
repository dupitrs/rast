/* Standalone legal pages use the homepage's Lenis version and scroll settings. */
(function () {
  'use strict';
  var lenis = null;
  var header = document.getElementById('header');
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('menu');
  if (header && toggle && menu) {
    var openLabel = toggle.getAttribute('aria-label');
    var closeLabel = document.documentElement.lang === 'en' ? 'Close menu' : 'Aizvērt izvēlni';
    var background = [document.querySelector('main'), document.querySelector('footer')]
      .concat(Array.from(header.children).filter(function (el) { return el !== toggle; }));

    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      menu.inert = !open;
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? closeLabel : openLabel);
      document.documentElement.classList.toggle('overlay-open', open);
      background.forEach(function (el) { if (el) el.inert = open; });
      if (lenis) open ? lenis.stop() : lenis.start();
      (open ? menu.querySelector('a') : toggle).focus({ preventScroll: true });
    }

    toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
    document.addEventListener('keydown', function (event) {
      if (!menu.classList.contains('is-open')) return;
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      var links = Array.from(menu.querySelectorAll('a[href]'));
      var first = links[0], last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); toggle.focus();
      } else if (event.shiftKey && document.activeElement === toggle) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); toggle.focus();
      } else if (!event.shiftKey && document.activeElement === toggle) {
        event.preventDefault(); first.focus();
      }
    });
    window.matchMedia('(min-width: 881px)').addEventListener('change', function (event) {
      if (event.matches && menu.classList.contains('is-open')) setOpen(false);
    });
  }

  if (!window.Lenis) return;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var frame = 0;

  function tick(time) {
    lenis.raf(time);
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    if (lenis) { lenis.destroy(); lenis = null; }
    if (motion.matches) return;
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    if (document.documentElement.classList.contains('overlay-open')) lenis.stop();
    frame = requestAnimationFrame(tick);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { onComplete: function () {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', function () { target.removeAttribute('tabindex'); }, { once: true });
        }
        target.focus({ preventScroll: true });
      } });
    });
  });

  motion.addEventListener('change', syncMotion);
  syncMotion();
})();
