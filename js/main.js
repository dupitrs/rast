/* ============================================================
   rast — interactions
   Guarded: works (gracefully degraded) even if a CDN fails.
   ============================================================ */
(function () {
  'use strict';

  window.__rastBooted = true;            // signal the head-script safety timer that JS is alive
  // NB: scroll-restoration is turned off and the page forced to the top in the <head> boot
  // script (runs before this), so reload / back-navigation always starts cleanly at the top.

  var html   = document.documentElement;
  var body   = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var hasGSAP  = typeof window.gsap !== 'undefined';
  var hasST    = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  if (!hasGSAP) html.classList.add('no-anim');           // CSS fallback: reveal everything
  if (hasST) {
    gsap.registerPlugin(ScrollTrigger);
    // Mobile browsers show/hide their address bar on scroll, which resizes the visual
    // viewport (100vh changes). Without this, ScrollTrigger re-measures mid-scroll and the
    // page snaps/jumps. ignoreMobileResize tells it to NOT refresh on those height-only
    // resizes, so scrolling up/down on a phone stays smooth.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Smooth scroll (Lenis) ---------------- */
  var lenis = null;
  if (hasLenis && !reduce) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    html.classList.add('lenis');

    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })();
    }
    lenis.on('scroll', function () { onScroll(lenis.scroll); });
  }

  /* ---------------- Header + scroll progress ---------------- */
  var header   = document.getElementById('header');
  var scrollBar = document.getElementById('scrollBar');
  var lastY = 0;

  function onScroll(y) {
    if (typeof y !== 'number') y = window.scrollY || window.pageYOffset;
    if (header) {
      header.classList.toggle('header--scrolled', y > 40);
      var menuOpen = menu && menu.classList.contains('is-open');
      if (y > lastY && y > 600 && !menuOpen) header.classList.add('header--hidden');
      else header.classList.remove('header--hidden');
    }
    if (scrollBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    lastY = y;
  }
  window.addEventListener('scroll', function () { if (!lenis) onScroll(window.scrollY); }, { passive: true });
  onScroll(0);

  /* ---------------- Mobile menu ---------------- */
  var toggle = document.getElementById('navToggle');
  var menu   = document.getElementById('menu');

  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open'); toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open'); toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  }
  if (toggle) toggle.addEventListener('click', function () {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  /* ---------------- Project form modal (Web3Forms — no backend) ---------------- */
  (function setupContactForm() {
    var modal = document.getElementById('formModal');
    var form  = document.getElementById('projectForm');
    if (!modal || !form) return;
    var serviceInput = document.getElementById('fService');
    var statusEl   = form.querySelector('.form__status');
    var submitBtn  = form.querySelector('[type="submit"]');
    var lastFocus  = null;

    /* ---- Custom service dropdown ---- */
    var cs = document.getElementById('fServiceSelect');
    var csBtn = cs && cs.querySelector('.cselect__btn');
    var csValue = cs && cs.querySelector('.cselect__value');
    var csList = cs && cs.querySelector('.cselect__list');
    var csOpts = cs ? cs.querySelectorAll('.cselect__opt') : [];
    var csPlaceholder = csValue ? csValue.textContent : 'Izvēlies pakalpojumu';
    function csOpen()  {
      if (!cs) return;
      cs.classList.add('is-open'); csBtn.setAttribute('aria-expanded', 'true');
      // The modal body scrolls (max-height 90svh); on phones the opened list can sit
      // below that scroll box's fold — bring it into view once it has expanded.
      setTimeout(function () {
        if (csList && csList.scrollIntoView) csList.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 230);
    }
    function csClose() { if (cs) { cs.classList.remove('is-open'); csBtn.setAttribute('aria-expanded', 'false'); } }
    function csSet(value) {
      if (!cs) return;
      var label = csPlaceholder, found = false;
      Array.prototype.forEach.call(csOpts, function (o) {
        var on = o.getAttribute('data-value') === value && value;
        o.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) { label = o.textContent.trim(); found = true; }
      });
      serviceInput.value = found ? value : '';
      csValue.textContent = label;
      csValue.classList.toggle('is-placeholder', !found);
    }
    if (cs) {
      csBtn.addEventListener('click', function (e) { e.stopPropagation(); cs.classList.contains('is-open') ? csClose() : csOpen(); });
      Array.prototype.forEach.call(csOpts, function (o) {
        o.addEventListener('click', function () { csSet(o.getAttribute('data-value')); csClose(); csBtn.focus(); });
      });
      document.addEventListener('click', function (e) { if (!cs.contains(e.target)) csClose(); });
    }

    function openForm(service) {
      lastFocus = document.activeElement;
      if (service) csSet(service);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      closeMenu();
      if (lenis) lenis.stop();
      var first = form.querySelector('input:not([type=hidden]):not(.form__hp), select, textarea');
      setTimeout(function () { if (first) try { first.focus(); } catch (e) {} }, 90);
    }
    function closeForm() {
      csClose();
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lenis) lenis.start();
      if (lastFocus) try { lastFocus.focus(); } catch (e) {}
    }

    Array.prototype.forEach.call(document.querySelectorAll('.js-open-form'), function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var service = el.getAttribute('data-service');
        if (!service) {                                   // service-card link → use that card's title
          var card = el.closest && el.closest('.svc__card');
          var t = card && card.querySelector('.svc__title');
          if (t) service = t.textContent.trim();
        }
        openForm(service);
      });
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.hasAttribute && e.target.hasAttribute('data-close'))) closeForm();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeForm();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!serviceInput.value) {                       // custom dropdown isn't a native field → validate manually
        if (statusEl) { statusEl.textContent = 'Lūdzu izvēlies pakalpojumu.'; statusEl.className = 'form__status is-err'; }
        csOpen();
        return;
      }
      if (statusEl) { statusEl.textContent = 'Sūta…'; statusEl.className = 'form__status is-sending'; }
      if (submitBtn) submitBtn.disabled = true;
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json && json.success) {
            if (statusEl) { statusEl.textContent = 'Paldies! Pieteikums nosūtīts, atbildēsim drīz.'; statusEl.className = 'form__status is-ok'; }
            form.reset();
            csSet('');
          } else {
            throw new Error((json && json.message) || 'error');
          }
        })
        .catch(function () {
          if (statusEl) { statusEl.textContent = 'Neizdevās nosūtīt. Mēģini vēlreiz vai raksti hello@raststudio.lv'; statusEl.className = 'form__status is-err'; }
        })
        .finally(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  })();

  /* ---------------- Anchor smooth scroll ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      if (a.classList.contains('js-open-form')) return;        // handled by the project-form modal
      var id = a.getAttribute('href');
      if (id === '#') { e.preventDefault(); return; }          // placeholder links
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------------- Follower dot (native cursor stays visible) ---------------- */
  if (fine) {
    var dot = document.getElementById('cursorDot');
    if (dot) {
      var mx = window.innerWidth / 2, my = window.innerHeight / 2, dx = mx, dy = my;
      window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
      (function loop() {
        dx += (mx - dx) * 0.18; dy += (my - dy) * 0.18;     // trails the real pointer
        dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        requestAnimationFrame(loop);
      })();
      // React (grow) over interactive elements
      Array.prototype.forEach.call(document.querySelectorAll('[data-cursor]'), function (el) {
        el.addEventListener('mouseenter', function () { dot.classList.add('is-active'); });
        el.addEventListener('mouseleave', function () { dot.classList.remove('is-active'); });
      });
    }
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (fine && !reduce) {
    Array.prototype.forEach.call(document.querySelectorAll('.magnetic'), function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.35;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.35;
        if (hasGSAP) gsap.to(el, { x: x, y: y, duration: 0.5, ease: 'power3.out' });
        else el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        if (hasGSAP) gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
        else el.style.transform = '';
      });
    });
  }

  /* ---------------- Split text into words (keeps <em>) ---------------- */
  function wrapWords(node) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        var parts = child.textContent.split(/(\s+)/);
        parts.forEach(function (part) {
          if (part === '') return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span'); w.className = 'word';
          var inner = document.createElement('span'); inner.className = 'w'; inner.textContent = part;
          w.appendChild(inner); frag.appendChild(w);
        });
      } else if (child.nodeType === 1) {
        var clone = child.cloneNode(false);
        clone.appendChild(wrapWords(child));
        frag.appendChild(clone);
      } else {
        frag.appendChild(child.cloneNode(true));
      }
    });
    return frag;
  }

  function setupSplit() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-split]'), function (el) {
      var frag = wrapWords(el);
      el.innerHTML = '';
      el.appendChild(frag);
      if (!hasST || reduce) return;                 // no animation → stays fully visible
      var words = el.querySelectorAll('.word .w');
      gsap.set(words, { opacity: 0, yPercent: 24 });
      gsap.to(words, {
        opacity: 1, yPercent: 0, ease: 'power3.out', stagger: 0.05, duration: 0.7,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true }   // appear word by word (not pre-dimmed)
      });
    });
  }

  /* ---------------- Reveal-on-scroll + intro ---------------- */
  var heroEl = document.querySelector('.hero');

  function playIntro() {
    if (!hasGSAP || reduce) return;
    var heroReveals = heroEl ? heroEl.querySelectorAll('[data-reveal]') : [];
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    // NB: y:0 in the from-state is load-bearing. The CSS pre-hide is
    // translateY(110%), which GSAP imports as PIXELS (percentages are already
    // resolved in computed style); animating only yPercent would leave that
    // pixel offset behind and the title would stay clipped forever.
    tl.fromTo('.hero__title .line > span', { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.1, stagger: 0.12 })
      .fromTo(heroReveals, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, '-=0.7');
  }

  function setupReveals() {
    if (!hasST || reduce) return;

    var all = gsap.utils.toArray('[data-reveal]');
    var outsideHero = all.filter(function (el) { return !heroEl || !heroEl.contains(el); });
    // Studijas principu kartītes parādās straujāk (snappy) nekā pārējie reveal —
    // sava, ātrāka partija, lai pārējā lapa paliek nemainīga.
    var principles = outsideHero.filter(function (el) { return el.classList.contains('studio__principle'); });
    var scrollReveals = outsideHero.filter(function (el) { return !el.classList.contains('studio__principle'); });

    ScrollTrigger.batch(scrollReveals, {
      start: 'top 88%',
      once: true,                       // play the slide-in once; never replay on re-scroll
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 28 }, {
          opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', overwrite: true
        });
      }
    });

    if (principles.length) {
      // Visi studijas principi parādās KOPĀ (bez stagger), nevis katrs atsevišķi. Trigers ir
      // viss principu bloks, tāpēc mazākos ekrānos tie nesadalās pa rindām — parādās vienlaikus.
      var principlesBox = principles[0].closest('.studio__principles') || principles[0];
      ScrollTrigger.create({
        trigger: principlesBox,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.fromTo(principles, { opacity: 0, y: 28 }, {
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', overwrite: true
          });
        }
      });
    }

    // CTA headline lines — pre-hidden via CSS (clipped by .line), slide up smoothly
    // on enter. immediateRender stays default(true) so they start hidden, not snapped.
    var ctaLines = document.querySelectorAll('.cta__title .line > span');
    if (ctaLines.length) {
      gsap.fromTo(ctaLines, { y: 0, yPercent: 110 }, {
        y: 0, yPercent: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.cta__title', start: 'top 85%', once: true }
      });
    }
  }

  /* ---------------- Interactive 2D particle canvas (WebGL fallback) ---------------- */
  // Reusable: pass a canvas + host section (defaults to the hero). Returns true when it boots.
  function setupCanvas(canvasEl, host) {
    var canvas = canvasEl || document.getElementById('heroCanvas');
    var hostEl = host || heroEl;
    if (!canvas || reduce || !fine) return false;    // skip on touch / reduced-motion
    var ctx = canvas.getContext('2d');
    if (!ctx) return false;

    var w, h, dpr, parts = [], raf = null, running = false;
    var mouse = { x: -9999, y: -9999 };
    var LINK = 122, REPEL = 150;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed() {
      var count = Math.max(28, Math.min(95, Math.floor(w * h / 16000)));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPEL && d > 0) { var f = (REPEL - d) / REPEL * 1.6; p.x += dx / d * f; p.y += dy / d * f; }
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244,240,233,0.55)'; ctx.fill();
      }
      for (var a = 0; a < parts.length; a++) {
        for (var b = a + 1; b < parts.length; b++) {
          var ddx = parts[a].x - parts[b].x, ddy = parts[a].y - parts[b].y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < LINK) {
            ctx.beginPath();
            ctx.moveTo(parts[a].x, parts[a].y); ctx.lineTo(parts[b].x, parts[b].y);
            ctx.strokeStyle = 'rgba(255,74,46,' + (1 - dist / LINK) * 0.16 + ')';
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; frame(); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    if (hostEl) {
      hostEl.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      hostEl.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
    }
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    // Pause when the host section scrolls out of view
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(hostEl || canvas);
    }
    size(); start();
    return true;
  }

  /* ---------------- Scroll parallax (data-parallax) ---------------- */
  function setupParallax() {
    if (!hasST || reduce) return;
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      gsap.fromTo(el, { yPercent: -speed * 0.5 }, {
        yPercent: speed * 0.5, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom', end: 'bottom top', scrub: 0.6
        }
      });
    });
  }

  /* ---------------- Band word: scroll-driven left→right colour fill ---------------- */
  // The giant "RODAS" outline word colours in from left to right as the band scrolls
  // through. JS drives the --fill CSS variable 0%→100%; CSS clips an accent gradient
  // to the glyphs (see .band__word). Reduced-motion: stays as a plain outline.
  function setupBandFill() {
    if (!hasST || reduce) return;
    var word = document.querySelector('.band__word');
    if (!word) return;
    ScrollTrigger.create({
      trigger: word.closest('section') || word,
      start: 'top 70%', end: 'bottom 80%', scrub: true,
      onUpdate: function (self) { word.style.setProperty('--fill', (self.progress * 100).toFixed(1) + '%'); }
    });
  }


  /* ---------------- Studio principles: line fills orange + subtext types on scroll ---- */
  // Each principle's top border fills orange left→right (scrubbed to scroll), and its
  // subtext reveals letter by letter over the same range. The fill is a pseudo-element
  // driven by the --fill custom property (0→1); letters are wrapped in .ch spans.
  function setupPrinciples() {
    var items = gsap.utils.toArray('.studio__principle');
    if (!items.length) return;

    // Wrap subtext into per-letter spans (keep an accessible label on the paragraph).
    items.forEach(function (item) {
      var p = item.querySelector('p');
      if (!p || p.querySelector('.ch')) return;
      var text = p.textContent;
      p.setAttribute('aria-label', text);
      var frag = document.createDocumentFragment();
      // Split into words + whitespace so lines break BETWEEN words, not mid-word.
      // Each word's letters go in a non-breaking .chw wrapper; spaces stay their
      // own .ch (the only allowed break points). Letters still animate via .ch.
      text.split(/(\s+)/).forEach(function (token) {
        if (token === '') return;
        if (/^\s+$/.test(token)) {
          var sp = document.createElement('span');
          sp.className = 'ch';
          sp.setAttribute('aria-hidden', 'true');
          sp.textContent = token;
          frag.appendChild(sp);
          return;
        }
        var word = document.createElement('span');
        word.className = 'chw';
        word.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < token.length; i++) {
          var span = document.createElement('span');
          span.className = 'ch';
          span.textContent = token.charAt(i);
          word.appendChild(span);
        }
        frag.appendChild(word);
      });
      p.textContent = '';
      p.appendChild(frag);
    });

    if (!hasST || reduce) return;   // no scroll animation → line + text stay fully visible

    items.forEach(function (item) {
      var chars = item.querySelectorAll('.ch');
      gsap.set(item, { '--fill': 0 });
      gsap.set(chars, { opacity: 0 });
      // Orange line fill (0→1, left→right), driven DIRECTLY from scroll progress in onUpdate —
      // animating the --fill custom property inside a GSAP tween proved unreliable (it stayed at 0).
      // It has its OWN, longer range so the line fills a touch more slowly than the text reveals.
      ScrollTrigger.create({
        trigger: item, start: 'top 92%', end: 'top 52%', scrub: 0.5,
        onUpdate: function (self) { item.style.setProperty('--fill', self.progress.toFixed(3)); },
        onRefresh: function (self) { item.style.setProperty('--fill', self.progress.toFixed(3)); }
      });
      // Subtext reveals letter by letter — kept on its own faster range.
      var tl = gsap.timeline({
        scrollTrigger: { trigger: item, start: 'top 88%', end: 'top 70%', scrub: 0.35 }
      });
      tl.to(chars, { opacity: 1, ease: 'none', stagger: { each: 0.011 }, duration: 1 }, 0.05);
    });
  }

  /* ---------------- Extra-services mini cards: same orange line fill on scroll ---------------- */
  function setupExtraLines() {
    if (!hasST || reduce) return;             // reduced/no-scroll → lines stay full (CSS default --fill:1)
    var minis = gsap.utils.toArray('.svc__mini');
    if (!minis.length) return;
    minis.forEach(function (item) {
      gsap.set(item, { '--fill': 0 });
      ScrollTrigger.create({
        trigger: item, start: 'top 92%', end: 'top 52%', scrub: 0.5,
        onUpdate: function (self) { item.style.setProperty('--fill', self.progress.toFixed(3)); },
        onRefresh: function (self) { item.style.setProperty('--fill', self.progress.toFixed(3)); }
      });
    });
  }

  /* ---------------- Process: sticky 3D cube (revolves left→right) ---------------- */
  // Desktop: the section is tall and .process__container is CSS-sticky (held centred);
  // this scrub (NO ScrollTrigger pin — its spacer was desyncing later sections) revolves
  // the four chapters as faces of a 3D cube around the Y axis, left→right like a storyline.
  // An ease-in-out scrub makes each face DWELL flat-on (text readable) and turn quickly
  // between faces, so you never have to read a card mid-rotation. Mobile/reduced: plain list.
  function setupProcess() {
    if (!hasST || reduce) return;
    var section = document.getElementById('process');
    var listEl = document.getElementById('processList');
    var counter = document.getElementById('procCount');
    var steps = gsap.utils.toArray('.step');
    if (!section || !listEl || !steps.length) return;

    listEl.classList.add('is-drum');
    var N = steps.length;

    function render(pos) {
      var active = Math.round(Math.max(0, Math.min(N - 1, pos)));
      var radius = window.innerWidth <= 860 ? 90 : 240;   // cube half-depth (px) — same geometry as before
      for (var i = 0; i < N; i++) {
        var delta = pos - i;                       // >0 already turned past (to the left), <0 upcoming (from the right)
        var ad = Math.abs(delta);
        // Each chapter is a face of a 3D cube 90° apart, revolving left→right around Y.
        // The active face sits flat-on (rotateY 0deg) so its text reads perfectly straight.
        steps[i].style.transform = 'rotateY(' + (-delta * 90) + 'deg) translateZ(' + radius + 'px)';
        steps[i].style.opacity = ad < 1 ? String(1 - ad * ad) : '0';   // only the front chapter is lit; side faces fade out
        steps[i].style.zIndex = ad < 0.5 ? '2' : '1';
        steps[i].classList.toggle('is-active', i === active);
      }
      if (counter) counter.textContent = steps[active].getAttribute('data-step');
    }

    // Ease-in-out within each step: the cube DWELLS flat-on (readable) and turns
    // between faces. smoothstep (gentler midpoint slope than the old cubic in-out)
    // keeps the flat-on dwell but rotates more smoothly — no abrupt mid-turn flip.
    function easePos(raw) {
      var base = Math.floor(raw), f = raw - base;
      var fs = f * f * (3 - 2 * f);
      return base + fs;
    }
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4,
      onUpdate: function (self) { render(easePos(self.progress * (N - 1))); },
      onRefresh: function (self) { render(easePos(self.progress * (N - 1))); }
    });
    render(0);
  }


  /* ---------------- Services: sticky "stacking cards" ---------------- */
  // The card cascade is pure CSS (position:sticky with staggered `top` offsets).
  function setupServices() { /* CSS-only cascade */ }

  /* ---------------- Services header: CSS-sticky, stays pinned through the cascade -----
  // The header is now CSS position:sticky (see .svc__pin .section-head), so it stays pinned
  // while all four cards cascade beneath it and releases naturally when the whole .svc__pin
  // block scrolls past. JS only keeps --deck-top in sync so the first card pins just BELOW
  // the pinned header instead of behind it. */
  function setupServicesHeader() {
    if (reduce) return;
    var head = document.querySelector('.svc__pin .section-head');
    var deck = document.querySelector('.svc__deck');
    if (!head || !deck) return;
    function measure() {
      var offset = parseFloat(getComputedStyle(head).top) || 96;   // resolved sticky top
      deck.style.setProperty('--deck-top', Math.round(offset + head.offsetHeight + 18) + 'px');
    }
    measure();
    window.addEventListener('resize', measure);
    if (hasST) ScrollTrigger.addEventListener('refreshInit', measure);
  }

  /* ---------------- Split text into characters (keeps element boundaries) ---------------- */
  function wrapChars(node) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {                                  // text → words of per-char spans
        child.textContent.split(/(\s+)/).forEach(function (token) {
          if (token === '') return;
          if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(' ')); return; }
          // letters of one word stay together in a .chw so lines wrap by words, not mid-word
          var w = document.createElement('span'); w.className = 'chw';
          for (var i = 0; i < token.length; i++) {
            var s = document.createElement('span'); s.className = 'ch'; s.textContent = token.charAt(i);
            w.appendChild(s);
          }
          frag.appendChild(w);
        });
      } else if (child.nodeType === 1) {                           // element (e.g. <br>, .impact__rast) → keep, recurse
        var clone = child.cloneNode(false);
        clone.appendChild(wrapChars(child));
        frag.appendChild(clone);
      } else {
        frag.appendChild(child.cloneNode(true));
      }
    });
    return frag;
  }

  /* ---------------- Impact: pinned letter reveal (static "rast", no font-morph — v3) ---------------- */
  function setupImpact() {
    var sec = document.getElementById('impact');
    if (!sec) return;
    var title = sec.querySelector('.impact__title');
    if (!title) return;

    var frag = wrapChars(title);
    title.innerHTML = '';
    title.appendChild(frag);

    // v3: nav fontu morphing. "rast" paliek statisks display fontā (Bricolage) —
    // tikai divas saimes sistēmā, un dekoratīvie fonti vairs netiek ielādēti.

    var chars = sec.querySelectorAll('.ch');
    if (!hasST || reduce || !chars.length) return;   // no scrub → letters stay visible

    // The CSS-sticky inner "holds" the question on screen (the stop); scrolling the
    // tall section scrubs the letters in slowly, one by one. No pin → no drift.
    gsap.set(chars, { opacity: 0, yPercent: 30 });
    gsap.to(chars, {
      opacity: 1, yPercent: 0, ease: 'none', stagger: 0.6,
      scrollTrigger: {
        trigger: sec, start: 'top top', end: 'bottom bottom',
        scrub: 0.6, invalidateOnRefresh: true
      }
    });
  }

  /* ---------------- WebGL hero (Three.js particle wave) ---------------- */
  var SNOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    '  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);',
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    '  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);',
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
    '  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
    '  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}'
  ].join('\n');

  // Wave at rest (progress 0) reproduces the hero exactly, then scroll morphs it:
  //   wave --(uToText)--> "rast" (white letters, orange dot) --(uToSphere)--> orange sphere.
  var VERT = [
    'uniform float uTime;uniform vec2 uMouse;uniform float uForce;uniform float uSize;uniform float uDpr;uniform vec3 uMouseW;',
    'uniform float uToText;uniform float uToSphere;uniform float uSpin;uniform float uSphereR;uniform vec3 uDotC;uniform float uGrow;',
    'attribute float aScale;attribute vec3 aText;attribute vec3 aSphere;attribute float aRand;attribute float aRelease;attribute float aIsDot;attribute float aSuck;',
    'varying float vH;varying float vForm;varying float vSphere;varying float vIsDot;varying float vFade;',
    SNOISE,
    'vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}',
    'vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}',
    'float ease(float t){return t<0.5?4.0*t*t*t:1.0-pow(-2.0*t+2.0,3.0)/2.0;}',
    'void main(){',
    '  vec3 p=position;',
    '  float e=snoise(p.xy*0.16+vec2(uTime*0.13,uTime*0.09));',
    '  e+=0.4*snoise(p.xy*0.46+vec2(-uTime*0.11,uTime*0.06));',
    '  float d=distance(p.xy,uMouse);',
    '  e+=smoothstep(3.2,0.0,d)*uForce*1.5;',
    '  p.z+=e;vH=e;',
    '  vec3 wave=rotX(p,-1.3509);',
    '  float tt=ease(clamp(uToText*1.6-aRelease*0.4-aRand*0.12,0.0,1.0));',   // staggered, but ALL reach 1 (no strays)
    '  vec3 pos=mix(wave,aText,tt);',
    '  vForm=tt;',
    '  float s=uToSphere;',
    '  float dNeck=length(vec2(position.x,position.y+9.0));',          // plane-space distance from the "neck" (projects to screen bottom-centre)
    '  float ci=clamp((s*1.6-dNeck*0.038-aRand*0.12)/0.4,0.0,1.0);',   // starts immediately, and the tail keeps arriving almost until the grow — no dead wait
    '  float t=ci*ci;',                                                // squared → gravity: hangs, then plunges; perfectly still at rest (s=0)
    '  float r1=fract(aRand*13.7)-0.5;float r2=fract(aRand*7.31);float r3=fract(aRand*29.7)-0.5;',
    '  vec3 fp=wave;',
    '  fp.y-=(2.5+4.5*r2)*t;',                                         // each dot has its OWN fall depth…
    '  fp.x+=r1*7.0*t*(1.0-t);',                                       // …its own sideways arc…
    '  fp.z+=r3*4.0*t*(1.0-t);',                                       // …and its own depth arc (zero at both ends)
    '  vec3 land=uDotC+aSphere*(0.12*fract(aRand*3.9));',              // landed dots pile into a tiny ROUND ball (Fibonacci directions, centre-dense) — the white dot itself
    '  fp=mix(fp,land,smoothstep(0.20+0.25*r2,1.0,t));',               // own turn-in moment — EVERY dot lands in that cluster
    '  pos=mix(pos,fp,smoothstep(0.0,0.02,t));',
    '  float mf=smoothstep(0.02,0.15,t)*(1.0-smoothstep(0.75,0.95,t));',   // interactive the whole flight; lets go just before joining the ball
    '  vec3 rd=normalize(uMouseW-cameraPosition);',                    // repel measured from the cursor RAY, not a fixed plane —
    '  vec3 np=cameraPosition+rd*dot(pos-cameraPosition,rd);',         // so exactly the dots UNDER the cursor react, at any depth
    '  float dRay=distance(pos,np);',
    '  pos+=(pos-np)/max(dRay,0.001)*smoothstep(1.2,0.0,dRay)*uForce*0.5*mf;',
    '  vSphere=0.0;',                                                  // in-flight dots keep their colour — ALL the orange is born from the white dot
    '  vFade=1.0-smoothstep(0.0,0.08,uGrow);',                         // the instant the grow starts, the cluster dissolves INTO the forming orange
    '  vIsDot=aIsDot;',   // orange amount (dot → sphere)
    '  float sm=mix(1.0,0.60,clamp(uToText,0.0,1.0));',
    '  sm=mix(sm,0.9,clamp(uToSphere,0.0,1.0));',
    '  vec4 mv=modelViewMatrix*vec4(pos,1.0);',
    '  gl_PointSize=uSize*aScale*uDpr*(10.0/-mv.z)*sm;',
    '  gl_Position=projectionMatrix*mv;}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uColorA;uniform vec3 uColorB;',
    'varying float vH;varying float vForm;varying float vSphere;varying float vIsDot;varying float vFade;',
    'void main(){',
    '  vec2 c=gl_PointCoord-0.5;float dd=dot(c,c);if(dd>0.25)discard;',
    '  float a=smoothstep(0.25,0.0,dd);',
    '  float t=smoothstep(-0.6,1.3,vH);',
    '  vec3 waveCol=mix(uColorA,uColorB,t);',
    '  float waveA=0.30+0.62*t;',
    '  vec3 formCol=mix(vec3(1.0),uColorA,vIsDot);',   // white letters, orange dot
    '  vec3 col=mix(waveCol,formCol,vForm);',
    '  col=mix(col,uColorA,vSphere);',   // orange as it enters the dot → sphere
    '  gl_FragColor=vec4(col,a*mix(waveA,0.82,vForm)*(1.0-0.42*vSphere)*vFade);}'
  ].join('\n');

  // Sample "rast" (with the logo-style accent dot) into world-space target points.
  function sampleRast(worldWidth) {
    var cw = 1100, ch = 340, oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
    var o = oc.getContext('2d');
    o.clearRect(0, 0, cw, ch);
    o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.font = '800 210px "Bricolage Grotesque", system-ui, sans-serif';
    o.fillText('rast', cw * 0.46, ch * 0.55);
    var wWord = o.measureText('rast').width;
    var rightEdge = cw * 0.46 + wWord / 2, dotR = 26;
    var dotX = rightEdge + dotR * 1.4, dotY = ch * 0.55 - 210 * 0.42;   // half above the "t", like the logo
    o.beginPath(); o.arc(dotX, dotY, dotR, 0, 7); o.fill();
    var img = o.getImageData(0, 0, cw, ch).data, pts = [], step = 2, scale = worldWidth / cw;
    var dcx = 0, dcy = 0, dn = 0;
    for (var yy = 0; yy < ch; yy += step) {
      for (var xx = 0; xx < cw; xx += step) {
        if (img[(yy * cw + xx) * 4 + 3] > 128) {
          var wx = (xx - cw / 2) * scale, wy = -(yy - ch / 2) * scale;
          var isd = ((xx - dotX) * (xx - dotX) + (yy - dotY) * (yy - dotY)) < (dotR + 2) * (dotR + 2);
          pts.push({ x: wx, y: wy, dot: isd });
          if (isd) { dcx += wx; dcy += wy; dn++; }
        }
      }
    }
    // shuffle so a same-size subsample (pts[i % len]) covers the glyphs evenly
    for (var a = pts.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)); var t = pts[a]; pts[a] = pts[b]; pts[b] = t; }
    return { pts: pts, dotX: dn ? dcx / dn : 0, dotY: dn ? dcy / dn : 0 };
  }

  // The hero particle "story": a fixed full-screen wave that, driven by scroll, morphs
  // wave → "rast" (white letters, orange dot) → spinning orange sphere. Wave at rest (0)
  // is the hero 1:1. `host` (hero section) supplies the mouse-repel target. Returns true
  // when WebGL boots, false so the caller can fall back to setupCanvas.
  function setupWave3D(canvas, host) {
    if (!canvas || !window.THREE || reduce) return false;
    var THREE = window.THREE, renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(dpr);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9);
    camera.lookAt(0, 0, 0);

    var small = Math.min(window.innerWidth, window.innerHeight) < 640;
    var SX = small ? 26 : 34, SY = small ? 18 : 24;
    var segX = small ? 76 : 112, segY = small ? 48 : 74;
    var geo = new THREE.PlaneGeometry(SX, SY, segX, segY);

    var n = geo.attributes.position.count, base = geo.attributes.position.array;
    var scales = new Float32Array(n), rand = new Float32Array(n), release = new Float32Array(n);
    var textT = new Float32Array(n * 3), sphereT = new Float32Array(n * 3), isDot = new Float32Array(n), suck = new Float32Array(n);
    var maxR = Math.sqrt((SX / 2) * (SX / 2) + (SY / 2) * (SY / 2)), GA = (1 + Math.sqrt(5)) / 2;
    for (var i = 0; i < n; i++) {
      scales[i] = 0.7 + Math.random() * 0.9;
      rand[i] = Math.random();
      var bx = base[i * 3], by = base[i * 3 + 1];
      release[i] = Math.min(1, Math.sqrt(bx * bx + by * by) / maxR);   // centre of the wave forms first
      var th = 2 * Math.PI * i / GA, ph = Math.acos(1 - 2 * (i + 0.5) / n);
      sphereT[i * 3]     = Math.sin(ph) * Math.cos(th);
      sphereT[i * 3 + 1] = Math.sin(ph) * Math.sin(th);
      sphereT[i * 3 + 2] = Math.cos(ph);
    }
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.setAttribute('aRelease', new THREE.BufferAttribute(release, 1));
    geo.setAttribute('aText', new THREE.BufferAttribute(textT, 3));
    geo.setAttribute('aSphere', new THREE.BufferAttribute(sphereT, 3));
    geo.setAttribute('aIsDot', new THREE.BufferAttribute(isDot, 1));
    geo.setAttribute('aSuck', new THREE.BufferAttribute(suck, 1));

    var uniforms = {
      uTime:     { value: 0 },
      uMouse:    { value: new THREE.Vector2(999, 999) },
      uMouseW:   { value: new THREE.Vector3(9999, 9999, 9999) },
      uForce:    { value: 0 },
      uSize:     { value: small ? 2.1 : 2.7 },
      uDpr:      { value: dpr },
      uToText:   { value: 0 },
      uToSphere: { value: 0 },
      uSpin:     { value: 0 },
      uSphereR:  { value: small ? 2.7 : 3.4 },
      uDotC:     { value: new THREE.Vector3(0, -3.2, 0) },   // the "black hole": centre-bottom of the front view
      uGrow:     { value: 0 },                               // grow progress — dissolves the landed cluster into the forming orange
      uColorA:   { value: new THREE.Color(0xff4a2e) },
      uColorB:   { value: new THREE.Color(0xf4f0e9) }
    };

    // Fill (and re-fill on webfont load / resize) the "rast" targets. rastW is the world
    // width of the word — shrunk on narrow (portrait) viewports so it always fits.
    var rastW = SX * 0.52;
    function buildTargets() {
      var s = sampleRast(rastW), TP = s.pts, L = TP.length || 1;
      var minX = 1e9, maxX = -1e9;
      for (var j = 0; j < L; j++) { if (TP[j].x < minX) minX = TP[j].x; if (TP[j].x > maxX) maxX = TP[j].x; }
      var spanX = Math.max(0.001, maxX - minX);
      for (var i = 0; i < n; i++) {
        var tp = TP[i % L];
        textT[i * 3]     = tp.x + (Math.random() - 0.5) * 0.02;
        textT[i * 3 + 1] = tp.y + (Math.random() - 0.5) * 0.02;
        textT[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
        isDot[i] = tp.dot ? 1 : 0;
        suck[i] = (tp.x - minX) / spanX;                 // 0 at the "r", 1 near the dot → left-to-right suck order
      }
      geo.attributes.aText.needsUpdate = true;
      geo.attributes.aIsDot.needsUpdate = true;
      geo.attributes.aSuck.needsUpdate = true;
      // (uDotC stays the fixed centre-bottom "black hole" — no longer tied to the text dot)
    }
    buildTargets();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTargets);

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var points = new THREE.Points(geo, mat);   // no object rotation — the tilt is baked into the wave in-shader
    scene.add(points);

    // Mouse raycast hits the shader-tilted wave plane; un-tilt the hit into plane-local xy.
    var TILT = -1.3509, cT = Math.cos(TILT), sT = Math.sin(TILT);
    var ray = new THREE.Raycaster();
    var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, -sT, cT).normalize(), new THREE.Vector3(0, 0, 0));
    var ndc = new THREE.Vector2(), hit = new THREE.Vector3();
    // camera-facing plane through the origin → gives a world cursor that drives the rast/sphere repel
    var camDir = new THREE.Vector3(), facePlane = new THREE.Plane(), hitW = new THREE.Vector3(), ORIGIN = new THREE.Vector3(0, 0, 0);
    var orb = document.getElementById('fxOrb'), tmpV = new THREE.Vector3();   // orange circle that grows from the dot
    // Blend pair: #fxOrbInk (white, difference) + #fxOrb (gradient, multiply) — moved in
    // lockstep so white text under the sphere reads BLACK on orange (see styles.css).
    var orbInk = document.getElementById('fxOrbInk');
    function orbCss(prop, val) { orb.style[prop] = val; if (orbInk) orbInk.style[prop] = val; }
    function orbFlat(on) {
      orb.classList.toggle('is-flat', on);
      if (orbInk) orbInk.classList.toggle('is-flat', on);
    }
    var targetForce = 0;
    var clock = new THREE.Clock();
    var raf = null, running = false;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      // Aspect-aware sizing so "rast" + sphere always fit (esp. portrait phones).
      var visW = 11.64 * (w / h);                              // ~visible world width at z=0, front camera
      uniforms.uSphereR.value = Math.min(small ? 2.7 : 3.4, 0.42 * visW);
      var newW = Math.min(SX * 0.52, 0.86 * visW);
      if (Math.abs(newW - rastW) > 0.15) { rastW = newW; buildTargets(); }
      measure();
    }
    // Pointer (mouse or touch) drives the repel. NDC is vs the fixed canvas, so it works
    // over any section — interactive through the whole wave → rast → sphere sequence.
    function pointer(cx, cy) {
      var r = canvas.getBoundingClientRect();
      ndc.x = ((cx - r.left) / r.width) * 2 - 1;
      ndc.y = -(((cy - r.top) / r.height) * 2 - 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {                // wave-height repel (plane-local)
        uniforms.uMouse.value.set(hit.x, cT * hit.y + sT * hit.z);
        targetForce = 1;
      }
      camera.getWorldDirection(camDir);                        // world cursor → rast/sphere repel
      facePlane.setFromNormalAndCoplanarPoint(camDir, ORIGIN);
      if (ray.ray.intersectPlane(facePlane, hitW)) {
        uniforms.uMouseW.value.copy(hitW);
        targetForce = 1;
      }
    }
    // Cache the assembly section's geometry — it drives the scroll timeline.
    var aTop = 0, aH = 0, suckStart = 0, suckLen = 1, growSpan = 1, fadeA = 1, fadeB = 1, travelStartY = 1e9;
    function measure() {
      var a = document.getElementById('assembly'), vh = window.innerHeight;
      aTop = a ? a.offsetTop : vh;
      aH = a ? a.offsetHeight : vh;
      // Fully scroll-driven so grow + travel compose cleanly: fall (from the very first
      // scrolled pixel — the centre particles are already raining at rest), suck, grow.
      suckStart = 0; suckLen = Math.max(1, aTop * 1.15); growSpan = Math.max(1, aH * 0.28);
      travelStartY = suckStart + suckLen + growSpan;   // sphere fully grown → orb released to travel
      var studioTop = aTop + aH - vh;
      fadeA = studioTop; fadeB = studioTop + vh * 0.75;      // fade the particle canvas as #studio rises
      buildStops();
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ez(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // The small dot appears where the particles suck in; scrolling then grows it into the full sphere.
    // Stores its last output (gx/gy/gd/go) so the traveller can take over seamlessly.
    var gx = null, gy = null, gd = null, go = null;
    function updateOrb(suckP, growP, hf) {
      var oA = Math.min(1, Math.max(0, growP / 0.05));            // no separate dot: the DOM circle appears only over the particle-made white cluster as the grow begins
      if (oA <= 0) { if (orb.style.opacity !== '0') orbCss('opacity', '0'); return; }
      var t = ez(growP);                                          // tiny white dot → big centred sphere (scroll)
      var vv = tmpV.copy(uniforms.uDotC.value).project(camera);
      var w2 = canvas.clientWidth, h2 = canvas.clientHeight;
      var dsx = (vv.x * 0.5 + 0.5) * w2, dsy = (-vv.y * 0.5 + 0.5) * h2;
      var cx2 = lerp(dsx, w2 / 2, t), cy2 = lerp(dsy, h2 / 2, t);
      var dia = lerp(14, Math.min(w2, h2) * 0.52, t);             // VERY small white dot → full sphere
      gx = cx2; gy = cy2; gd = dia; go = oA * hf;                 // remembered for the traveller handoff
      // Flat (no blend) only during the white→orange melt (--oj reaches 1 by growP≈0.40).
      // Once the sphere is fully orange, switch to the SAME blend the traveller uses, while
      // it's still small and over the empty black section — so the grow→travel handoff at
      // max size has NO blend flip and therefore no visible colour jump.
      orbFlat(growP < 0.5);                                       // early melt flat; fully-orange sphere already blended before it moves
      orb.style.setProperty('--oj', ez(Math.min(1, Math.max(0, (growP - 0.05) / 0.35))).toFixed(3));   // white melts into orange slowly and smoothly (eased)
      orbCss('transform', 'translate(' + (cx2 - 50) + 'px,' + (cy2 - 50) + 'px) scale(' + (dia / 100) + ')');
      orbCss('opacity', '' + (oA * hf));
    }

    /* -------- Travelling orb: a scroll-keyframed journey down the page ----------------------
       Beats (per the brief): grown sphere → exits LEFT before Services → flies back in small
       from the RIGHT at Work → slides to the LEFT at the FAQ (rides down the questions;
       follows a hovered question and grows if it's open) → drops off the bottom → reappears
       from the RIGHT at the Manifesto, arcs over the top and drops away. Hidden elsewhere.
       Each keyframe: {y scroll, xf/yf viewport-fraction centre, px diameter, op opacity}.
       Positions are easy to retune — just edit the numbers. */
    var stops = [], faqHover = null, faqZone = [1e9, 1e9], svcZone = [1e9, 1e9], insZone = [1e9, 1e9], wkZone = [1e9, 1e9];
    function buildStops() {
      var vmin = Math.min(window.innerWidth, window.innerHeight), vh = window.innerHeight;
      function D(p) { return vmin * p / 100; }
      function top(sel) { var e = document.querySelector(sel); return e ? e.offsetTop : null; }
      function ht(sel) { var e = document.querySelector(sel); return e ? e.offsetHeight : 0; }
      var st = top('#studio'), stH = ht('#studio'), sv = top('#services'), svH = ht('#services'),
          wk = top('#work'), wkH = ht('#work'), fq = top('#faq'), fqH = ht('#faq'),
          pr = top('#process'), prH = ht('#process'), im = top('#impact'), imH = ht('#impact'),
          ins = top('#insights'), insH = ht('#insights'), mf = top('.manifesto'), bd = top('.band');
      faqZone = fq != null ? [fq, fq + fqH] : [1e9, 1e9];
      svcZone = sv != null ? [sv - vh * 0.6, sv + svH * 0.68] : [1e9, 1e9];   // orb rides z-index:1 here — above bg, behind cards
      insZone = ins != null ? [ins - vh, ins + insH * 0.92] : [1e9, 1e9]; // …and BEHIND the article cards from the moment the section enters
      wkZone = wk != null ? [wk - vh * 0.2, wk + wkH] : [1e9, 1e9];       // …and BEHIND the work cards (photos would break the blend colours)
      var K = [{ y: travelStartY, xf: 0.50, yf: 0.50, px: D(52), op: 1.0 }];   // grown sphere, centred (over empty space)
      // MOBILE: the journey ends at the studio statement — the sphere docks beside
      // "Internets ir pilns ar lapām…" and then rides up WITH the page (yf falls 1:1
      // with scroll = document-anchored), gone for the rest of the page.
      if (window.innerWidth <= 760) {
        if (st != null) {
          var dockY = st - vh * 0.30;                                              // statement ~1/3 down the viewport
          K.push({ y: st - vh * 0.60, xf: 0.78, yf: 0.40, px: D(34), op: 0.95 });  // eases RIGHT as #studio rises
          K.push({ y: dockY, xf: 0.80, yf: 0.34, px: D(26), op: 0.92 });           // docks beside the statement
          K.push({ y: dockY + vh * 0.55, xf: 0.80, yf: -0.21, px: D(26), op: 0.92 }); // scrolls out the top with the section
          K.push({ y: dockY + vh * 0.65, xf: 0.80, yf: -0.21, px: D(26), op: 0.0 }); // hidden from here on
        }
        stops = K;
        faqZone = [1e9, 1e9];   // no FAQ follow — the journey is already over by then
        return;
      }
      // Waypoints tuned for near-UNIFORM speed (screen-distance / scroll-distance kept in a
      // narrow band; intentional exceptions: FAQ vertical ride, impact entry, fading exits).
      if (st != null) {
        K.push({ y: st - vh * 0.60, xf: 0.82, yf: 0.35, px: D(72), op: 0.95 });  // eases RIGHT as #studio rises — clear of the statement
        K.push({ y: st, xf: 0.86, yf: 0.25, px: D(56), op: 0.92 });              // beside the statement, above the principles
        K.push({ y: st + stH * 0.45, xf: 0.94, yf: 0.42, px: D(32), op: 0.90 }); // tucks into the right gutter while the principles pass
        K.push({ y: st + stH * 0.95, xf: 0.64, yf: 0.46, px: D(48), op: 0.85 }); // then curves LEFT (into the behind-the-cards zone)
      }
      if (sv != null) {
        K.push({ y: sv + svH * 0.22, xf: 0.30, yf: 0.54, px: D(48), op: 0.80 });  // sweeps LEFT through the "Ko tu iegūsi." cards
        K.push({ y: sv + svH * 0.62, xf: -0.42, yf: 0.60, px: D(44), op: 0.0 });  // exits off the LEFT edge, unhurried
      }
      if (wk != null) {
        K.push({ y: wk + wkH * 0.08, xf: -0.25, yf: 0.44, px: D(44), op: 0.0 });  // waits just off LEFT, same size it left at
        K.push({ y: wk + wkH * 0.45, xf: 0.14, yf: 0.40, px: D(44), op: 0.95 });  // glides back in, then one long arc to the FAQ
      }
      if (fq != null) {
        K.push({ y: fq + fqH * 0.30, xf: 0.955, yf: 0.30, px: D(18), op: 0.95 }); // in the right margin by the questions
        K.push({ y: fq + fqH * 0.65, xf: 0.955, yf: 0.74, px: D(18), op: 0.95 }); // rides down (FAQ = the speed exception)
      }
      if (pr != null) {
        // NO climb over the top: out of the FAQ the orb keeps SINKING down the right edge
        // and smoothly slides off the bottom (drifting a touch left, clear of the text) —
        // fully gone before chapter "02" revolves in (the drum scrubs over prH − vh).
        var scrub = Math.max(1, prH - vh);
        K.push({ y: pr, xf: 0.93, yf: 0.80, px: D(22), op: 0.92 });                // still low on the right edge
        K.push({ y: pr + scrub * 0.08, xf: 0.80, yf: 0.97, px: D(24), op: 0.75 }); // eases down toward the bottom edge
        K.push({ y: pr + scrub * 0.15, xf: 0.66, yf: 1.22, px: D(24), op: 0.0 });  // slips below the screen — gone before "02"
      }
      if (im != null) {
        K.push({ y: im - vh * 0.35, xf: 1.35, yf: 0.72, px: D(18), op: 0.0 });   // stays hidden, regrouping toward the RIGHT
        K.push({ y: im - vh * 0.15, xf: 1.50, yf: 0.42, px: D(54), op: 0.0 });   // regroups off-screen as the letters begin
        K.push({ y: im + imH * 0.22, xf: 0.82, yf: 0.40, px: D(54), op: 0.95 }); // sweeps in — 3× size, beside the title
        K.push({ y: im + imH * 0.70, xf: 0.82, yf: 0.40, px: D(54), op: 0.95 }); // holds big, DEAD-STILL, until just past the section
      }
      if (ins != null) {
        K.push({ y: ins + insH * 0.35, xf: 0.40, yf: 0.56, px: D(34), op: 0.92 });// one curved diagonal down-LEFT behind the articles
      }
      if (mf != null) {
        K.push({ y: mf + vh * 0.10, xf: 0.32, yf: 0.80, px: D(32), op: 0.90 });  // rests low, left of centre, while the quote reads (close to the fall line — no zigzag)
        K.push({ y: mf + vh * 0.26, xf: 0.60, yf: 1.02, px: D(14), op: 0.55 });  // the cite passes → FALLS at once AND shrinks fast, just right of centre…
        K.push({ y: mf + vh * 0.42, xf: 0.66, yf: 1.48, px: D(5), op: 0.0 });    // …shrinks to a speck as it drops off the screen — gone before "Radīsim kaut ko neaizmirstamu."
      }
      stops = K;
    }
    // Follow a hovered FAQ question (and grow when it's open).
    Array.prototype.forEach.call(document.querySelectorAll('.faq__item'), function (it) {
      it.addEventListener('mouseenter', function () { faqHover = it; });
      it.addEventListener('mouseleave', function () { if (faqHover === it) faqHover = null; });
    });
    // Catmull-Rom → the path curves smoothly THROUGH the waypoints (big sweeping arcs, never
    // straight lines). Damping adds extra smoothing; a min-step keeps the FAQ follow from crawling.
    function cr(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
    function damp(cur, tgt, k, minStep) {
      var d = tgt - cur, s = d * k;
      if (minStep && Math.abs(s) < minStep) s = (d < 0 ? -1 : 1) * Math.min(minStep, Math.abs(d));
      return cur + s;
    }
    var dX = null, dY = null, dP = null, dO = null;
    function travelOrb(y) {
      var n = stops.length; if (n < 2) return;
      var i = 0; for (; i < n - 1; i++) { if (y <= stops[i + 1].y) break; }
      if (i > n - 2) i = n - 2;
      var A = stops[i], B = stops[i + 1];
      // LINEAR param (no per-segment easing): easing made the orb brake to zero at every
      // waypoint — stop-start speeds. Linear + the Catmull-Rom curve + damping = one
      // continuous glide at near-uniform speed, corners rounded by the damping.
      var te = Math.min(1, Math.max(0, (y - A.y) / Math.max(1, B.y - A.y)));
      var P0 = stops[Math.max(0, i - 1)], P3 = stops[Math.min(n - 1, i + 2)];
      var w2 = canvas.clientWidth, h2 = canvas.clientHeight;
      var xf, yf;
      if (A.xf === B.xf && A.yf === B.yf) { xf = A.xf; yf = A.yf; }   // identical stops → hold dead-still (no spline wiggle)
      else { xf = cr(P0.xf, A.xf, B.xf, P3.xf, te); yf = cr(P0.yf, A.yf, B.yf, P3.yf, te); }
      var px = lerp(A.px, B.px, te), op = lerp(A.op, B.op, te);
      if (faqHover && y > faqZone[0] && y < faqZone[1]) {          // follow the hovered question (grow if open)
        var r = faqHover.getBoundingClientRect();
        xf = 0.955; yf = (r.top + r.height / 2) / h2;
        px = Math.min(w2, h2) * (faqHover.hasAttribute('open') ? 0.24 : 0.18);
        op = 0.95;
      }
      var tx = xf * w2, ty = yf * h2;
      // First frame after taking over from the grow phase: continue from EXACTLY where the
      // grown sphere was rendered (no jump), then damp toward the travel path.
      if (dX === null) { dX = (gx != null ? gx : tx); dY = (gy != null ? gy : ty); dP = (gd != null ? gd : px); dO = (go != null ? go : op); }
      dX = damp(dX, tx, 0.05, 1.6); dY = damp(dY, ty, 0.05, 1.6);   // speed ∝ distance, with a floor
      dP = damp(dP, px, 0.06, 0);  dO = damp(dO, op, 0.08, 0);
      var zi = '800';
      // z-index 1 = ABOVE every section background (bodies/panels paint at z:auto/0, incl. the OPAQUE
      // #studio panel) but BEHIND the cards (svc__card is z-index 2). So the sphere is always visible
      // over the black bg AND always tucked behind the cards — never vanishes into black, never on top.
      if (y > svcZone[0] && y < svcZone[1]) zi = '1';
      else if (y > wkZone[0] && y < wkZone[1]) zi = '-1';     // behind the work cards — never over the photos
      else if (y > insZone[0] && y < insZone[1]) zi = '1';    // behind the article cards (z-index 2) but OVER the plain section text
      orbCss('zIndex', zi);
      orbFlat(false);                                         // travel phase: blending back on (sphere passes over text)
      orb.style.setProperty('--oj', '1');                     // travelling orb is always fully orange (even after an instant jump mid-collect)
      orbCss('transform', 'translate(' + (dX - 50) + 'px,' + (dY - 50) + 'px) scale(' + (dP / 100) + ')');
      orbCss('opacity', '' + dO);
    }
    // SINGLE writer for the orb, both phases (grow + travel) — two competing writers at the
    // handoff caused a visible stutter. Always-on so it keeps running after the WebGL stops.
    (function orbLoop() {
      if (orb) {
        var y = window.pageYOffset || 0;
        if (y >= travelStartY) travelOrb(y);
        else {
          dX = null;                                             // next takeover re-syncs from the grow output
          if (orb.style.zIndex !== '800') orbCss('zIndex', '800');   // an instant jump up (Ctrl+F, scrollbar flick) must not keep a card-zone z-index
          var suckP = Math.min(1, Math.max(0, (y - suckStart) / suckLen));
          var growP = Math.min(1, Math.max(0, (y - suckStart - suckLen) / growSpan));
          var hf = 1 - Math.min(1, Math.max(0, (y - fadeA) / Math.max(1, fadeB - fadeA)));
          updateOrb(suckP, growP, hf);
        }
      }
      requestAnimationFrame(orbLoop);
    })();

    function frame() {
      var dt = Math.min(clock.getDelta(), 0.05);
      uniforms.uTime.value += dt;
      uniforms.uForce.value += (targetForce - uniforms.uForce.value) * 0.07;
      targetForce *= 0.95;

      var y = window.pageYOffset || 0;

      // "rast" stage DROPPED (uToText stays 0): the wave drains down, then funnels into the dot
      var suckP = Math.min(1, Math.max(0, (y - suckStart) / suckLen));
      uniforms.uToSphere.value = suckP;
      uniforms.uGrow.value = Math.min(1, Math.max(0, (y - suckStart - suckLen) / growSpan));
      // camera stays FIXED on the hero landscape view — the platform never changes perspective

      // fade the particle canvas as #studio rises (the orb itself is driven solely by orbLoop)
      canvas.style.opacity = '' + (1 - Math.min(1, Math.max(0, (y - fadeA) / Math.max(1, fadeB - fadeA))));

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; clock.start(); frame(); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }

    resize(); measure();
    window.addEventListener('resize', resize);
    if (hasST && ScrollTrigger.addEventListener) ScrollTrigger.addEventListener('refresh', measure);
    window.addEventListener('mousemove', function (e) { pointer(e.clientX, e.clientY); });
    window.addEventListener('touchmove', function (e) { if (e.touches[0]) pointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    var clearPtr = function () { uniforms.uMouse.value.set(999, 999); uniforms.uMouseW.value.set(9999, 9999, 9999); };
    window.addEventListener('touchend', clearPtr);
    document.addEventListener('mouseleave', clearPtr);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    // Render while the hero OR the assembly section is on screen; idle everywhere else.
    if ('IntersectionObserver' in window) {
      var vis = { a: false, b: false }, upd = function () { (vis.a || vis.b) ? start() : stop(); };
      new IntersectionObserver(function (e) { vis.a = e[0].isIntersecting; upd(); }, { threshold: 0 }).observe(host || canvas);
      var asm = document.getElementById('assembly');
      if (asm) new IntersectionObserver(function (e) { vis.b = e[0].isIntersecting; upd(); }, { threshold: 0 }).observe(asm);
      else start();
    } else { start(); }
    return true;
  }

  function setupHero3D() {
    var canvas = document.getElementById('heroCanvas');
    if (!setupWave3D(canvas, heroEl)) setupCanvas(canvas, heroEl);
  }

  /* ---------------- Preloader ---------------- */
  var loader = document.getElementById('loader');
  var loaderDone = false;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    if (loader) loader.classList.add('is-done');
    body.style.overflow = '';
    if (lenis) lenis.start();
    // Reveal the hero title only once webfonts are ready, so it can't reflow
    // (fallback → Bricolage swap) mid slide-in — that swap is the "glitch".
    if (document.fonts && document.fonts.ready) {
      var introRan = false;
      var runIntro = function () { if (!introRan) { introRan = true; playIntro(); } };
      document.fonts.ready.then(runIntro);
      setTimeout(runIntro, 800);   // fallback so the title never stays hidden
    } else { playIntro(); }
    if (hasST) setTimeout(function () { ScrollTrigger.refresh(); }, 100);
  }

  function runLoader() {
    if (!loader || reduce) { finishLoader(); return; }
    body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    var countEl = document.getElementById('loaderCount');
    var fillEl  = document.getElementById('loaderFill');
    var t0 = performance.now(), dur = 1300;
    (function tick(now) {
      var t = Math.min(1, (now - t0) / dur);
      var p = Math.round(t * 100);
      if (countEl) countEl.textContent = p;
      if (fillEl) fillEl.style.width = (t * 100) + '%';
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(finishLoader, 260);
    })(performance.now());
  }

  /* ---------------- Boot ---------------- */
  // Split text + scroll scenes are built AFTER webfonts settle so the
  // word-splitting doesn't reflow/jump when the display font swaps in.
  var scenesBuilt = false;
  function buildScenes() {
    if (scenesBuilt) return;
    scenesBuilt = true;
    setupSplit();
    setupReveals();
    setupParallax();
    setupBandFill();
    setupPrinciples();
    setupExtraLines();
    setupImpact();
    setupProcess();
    setupServices();
    setupServicesHeader();
    if (hasST) ScrollTrigger.refresh();
  }

  function init() {
    try {
      setupHero3D();          // WebGL wave; falls back to the 2D canvas inside
      runLoader();
      if (window.gsap && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(buildScenes);
        setTimeout(buildScenes, 1500);          // safety if fonts.ready never resolves
      } else {
        buildScenes();
      }
    } catch (err) {
      // Never leave the page broken: reveal content + drop the loader
      html.classList.add('no-anim');
      if (loader) loader.classList.add('is-done');
      body.style.overflow = '';
      if (window.console) console.warn('rast init:', err);
    }
  }

  // Hard safety: drop loader no matter what
  window.addEventListener('load', finishLoader);
  // Recompute all pin/scrub positions once everything (video, fonts, images) has
  // fully loaded — prevents pinned sections (impact) from using stale positions.
  // Force the top first (a reload must never start mid-page, or the pins miscalculate).
  if (hasST) window.addEventListener('load', function () {
    // If we arrived with a hash (e.g. from a case-study/article via "Citi darbi"/"Citi ieskati"),
    // honour it: refresh first, THEN jump to that section. Otherwise start at the top
    // (a plain reload must not start mid-page, or the pinned sections miscalculate).
    var hash = location.hash;
    var target = (hash && hash.length > 1) ? document.querySelector(hash) : null;
    if (!target) { window.scrollTo(0, 0); if (lenis) lenis.scrollTo(0, { immediate: true }); }
    setTimeout(function () {
      ScrollTrigger.refresh();
      if (target) {
        if (lenis) lenis.scrollTo(target, { immediate: true, offset: 0 });
        else target.scrollIntoView();
      }
    }, 350);
  });
  setTimeout(finishLoader, 4500);

  // Don't let the browser restore a stale mid-page scroll position on reload/back —
  // ScrollTrigger pins miscalculate if the page starts anywhere but the top.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Pages reached by "back" — e.g. returning to the homepage from an article/case-study —
  // may be restored from the browser's back/forward cache (bfcache) without re-running
  // init. The rAF-driven GSAP ticker that also powers Lenis never resumes, so scrolling
  // and every scroll-linked animation freeze and the page looks broken. Force a clean
  // reload so everything re-initialises from scratch (the preloader masks the rebuild).
  // `e.persisted` catches true bfcache restores; the navigation-type check also catches
  // back/forward loads served from the HTTP cache where the same stale state can appear.
  function isBackForward() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      return !!(nav && nav.type === 'back_forward');
    } catch (err) { return false; }
  }
  window.addEventListener('pageshow', function (e) {
    if (e.persisted || isBackForward()) window.location.reload();
  });

  /* ---------------- White text goes black ONLY where the sphere's circle covers it ----------
     For each targeted white-text element we build a black clone that sits ABOVE the sphere and
     is clip-path'd to the sphere's circle. So only the letters actually under the disc turn
     black — the rest of the line stays white — instead of the whole text block flipping.
     Gating: text on a TRANSPARENT section background (FAQ, work card names/categories, plain
     copy) shows the orange sphere through from behind, so it activates whenever the sphere is
     visible at any z-index. Text on an OPAQUE card (services deck, article cards, the CTA card,
     the studio panel) hides the sphere when it slides BEHIND the card, so it activates ONLY
     while the sphere is above everything (z-index 800). */
  function setupOrbInvert() {
    if (reduce) return;
    var orb = document.getElementById('fxOrb');
    if (!orb) return;
    // NOTE: .hero__title and .impact__line are excluded — their letters carry live GSAP
    // transforms, so a static clone can't track them.
    var SEL = '.section-title, .faq__q, .svc__title, .work__name, .work__cat, .step__title,' +
              ' .band__title, .insight__title, .process__lead,' +
              ' .section-note, .faq__a, .svc__lead, .step__desc';
    var els = [].slice.call(document.querySelectorAll(SEL));
    if (!els.length) return;
    var ORB_ABOVE_ONLY = '.svc__card, .insight, .work__card--cta, .studio';
    var COPY = ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','letterSpacing',
                'lineHeight','textTransform','textAlign','textIndent','wordSpacing','whiteSpace','direction'];
    var targets = [];
    function styleClone(tg) {
      var cs = getComputedStyle(tg.el), s = tg.clip.style;
      for (var k = 0; k < COPY.length; k++) s[COPY[k]] = cs[COPY[k]];
      tg.padL = parseFloat(cs.paddingLeft) || 0;
      tg.padT = parseFloat(cs.paddingTop) || 0;
      tg.padR = parseFloat(cs.paddingRight) || 0;
    }
    for (var t = 0; t < els.length; t++) {
      var el = els[t];
      var clip = document.createElement('span');
      clip.className = 'orb-cliptext';
      clip.setAttribute('aria-hidden', 'true');
      clip.innerHTML = el.innerHTML;
      // Text only — drop icons/marks/arrows so the black copy never doubles a +/− or →.
      Array.prototype.forEach.call(clip.querySelectorAll('i, svg, .faq__mark'), function (n) { n.parentNode.removeChild(n); });
      document.body.appendChild(clip);
      var tg = { el: el, clip: clip, aboveOnly: !!el.closest(ORB_ABOVE_ONLY), on: false, padL: 0, padT: 0, padR: 0 };
      styleClone(tg);
      targets.push(tg);
    }
    var vh = window.innerHeight;
    window.addEventListener('resize', function () {
      vh = window.innerHeight;
      for (var i = 0; i < targets.length; i++) styleClone(targets[i]);
    });
    // circle (centre cx,cy radius r) intersects rect b?
    function hits(cx, cy, r, b) {
      var nx = Math.max(b.left, Math.min(cx, b.right)), ny = Math.max(b.top, Math.min(cy, b.bottom));
      var dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy < r * r;
    }
    (function tick() {
      var o = orb.getBoundingClientRect();
      var z = orb.style.zIndex;
      var visible = z !== '' && parseFloat(orb.style.opacity || '0') > 0.4 && o.width > 6;
      var above = z === '800';
      var cx = (o.left + o.right) / 2, cy = (o.top + o.bottom) / 2, r = o.width * 0.5;
      for (var i = 0; i < targets.length; i++) {
        var tg = targets[i], on = false, b = null;
        var frontOK = tg.aboveOnly ? above : visible;
        if (frontOK) { b = tg.el.getBoundingClientRect(); on = b.bottom > 0 && b.top < vh && hits(cx, cy, r, b); }
        if (on) {
          var lx = b.left + tg.padL, ty = b.top + tg.padT;
          var cst = tg.clip.style;
          cst.left = lx + 'px'; cst.top = ty + 'px';
          cst.width = (tg.el.clientWidth - tg.padL - tg.padR) + 'px';
          var cp = 'circle(' + r + 'px at ' + (cx - lx) + 'px ' + (cy - ty) + 'px)';
          cst.webkitClipPath = cp; cst.clipPath = cp;
          if (!tg.on) { cst.display = 'block'; tg.on = true; }
        } else if (tg.on) {
          tg.clip.style.display = 'none'; tg.on = false;
        }
      }
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setupOrbInvert();
})();
