/* ============================================================
   rast — interactions
   Guarded: works (gracefully degraded) even if a CDN fails.
   ============================================================ */
(function () {
  'use strict';

  window.__rastBooted = true;            // signal the head-script safety timer that JS is alive

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
    var scrollReveals = all.filter(function (el) { return !heroEl || !heroEl.contains(el); });

    ScrollTrigger.batch(scrollReveals, {
      start: 'top 88%',
      once: true,                       // play the slide-in once; never replay on re-scroll
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 28 }, {
          opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', overwrite: true
        });
      }
    });

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

  /* ---------------- Interactive hero canvas ---------------- */
  function setupCanvas() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas || reduce || !fine) return;          // skip on touch / reduced-motion
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    if (heroEl) {
      heroEl.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      heroEl.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });
    }
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    // Pause when hero scrolls out of view
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(heroEl || canvas);
    }
    size(); start();
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

  /* ---------------- Studio handoff: fade in over the video's end-frame ---------------- */
  // Studio overlaps the video's last viewport (CSS margin-top:-100vh) and starts at
  // opacity 0, so it rises into place INVISIBLY. Its content is vertically centred in
  // that viewport (CSS min-height:100vh + flex). When it reaches the top (the clip's
  // end frame) the fade plays as a simple, one-shot, time-based tween — NOT scrubbed to
  // scroll — so the section just blooms in centred over the held end-frame.
  function setupStudioHandoff() {
    if (!hasST || reduce) return;
    var studio = document.getElementById('studio');
    if (!studio) return;
    // Simple time-based fade, reversible: fades IN over 0.9s on enter, and fades OUT
    // ~3× faster (timeScale on reverse) when scrolling back up.
    var fade = gsap.to(studio, { opacity: 1, duration: 0.9, ease: 'power2.out', paused: true });
    ScrollTrigger.create({
      trigger: studio, start: 'top 30%',
      onEnter:     function () { fade.timeScale(1).play(); },
      onLeaveBack: function () { fade.timeScale(3).reverse(); }
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
    // quickly between faces, so you never have to read a card mid-rotation.
    function easePos(raw) {
      var base = Math.floor(raw), f = raw - base;
      var fs = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      return base + fs;
    }
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.1,
      onUpdate: function (self) { render(easePos(self.progress * (N - 1))); },
      onRefresh: function (self) { render(easePos(self.progress * (N - 1))); }
    });
    render(0);
  }

  /* ---------------- Scroll-scrubbed video section ---------------- */
  // Its own section after the hero. The clip scrubs as the section scrolls and STARTS the
  // moment the section enters from the hero ('top bottom'), so the hero particles hand off
  // straight into it; the sticky inner holds it on screen while it finishes, and #studio
  // (pulled up in CSS) scrolls UP OVER it. Scrubs on touch too: the clip is all-keyframe
  // encoded, so seeks are frame-accurate, and the eased ticker below hides seek latency.
  function setupScrollVideo() {
    var sec = document.getElementById('scrollvid');
    var video = document.getElementById('scrollVideo');
    if (!sec || !video || !hasST || reduce) return;   // CSS hides the section when we can't scrub

    function build() {
      var dur = video.duration;
      if (!isFinite(dur) || dur <= 0) dur = 7;
      var target = 0;
      // Prime decoding (play→pause) so seeked frames actually paint — on phones a
      // never-started video can stay black when only ever seeked.
      try {
        var pr = video.play();
        if (pr && pr.then) pr.then(function () { video.pause(); }).catch(function () {});
      } catch (e) {}
      // Scrub the clip across the whole section, starting as it enters from the hero.
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom', end: 'bottom bottom',
        scrub: true, invalidateOnRefresh: true,
        onUpdate: function (self) { target = self.progress * dur; }
      });
      // Don't write currentTime straight from scroll events: on phones each seek is
      // comparatively slow and one-per-event reads as stutter. Instead ease the time
      // toward the scroll target every frame and never start a new seek while the
      // previous one is still in flight — smooth on touch, identical on desktop.
      gsap.ticker.add(function () {
        if (video.seeking) return;
        var cur = video.currentTime || 0;
        var diff = target - cur;
        if (!isFinite(diff) || Math.abs(diff) < 1 / 60) return;   // already on the right frame
        var next = Math.abs(diff) < 0.12 ? target : cur + diff * 0.22;
        try { video.currentTime = next; } catch (e) {}
      });
      ScrollTrigger.refresh();
    }
    if (video.readyState >= 1) build();
    else video.addEventListener('loadedmetadata', build, { once: true });
  }

  /* ---------------- Services: sticky "stacking cards" ---------------- */
  // The card cascade is pure CSS (position:sticky with staggered `top` offsets).
  function setupServices() { /* CSS-only cascade */ }

  /* ---------------- Services header: hold during cascade, release when last card lands -----
  // CSS sticky would cling to the very bottom of the deck (header drags to the end). Instead
  // we drive the header ourselves: it "sticks" at the top while the cards cascade in, then
  // RELEASES the instant the last card reaches its pinned spot, so it scrolls away while the
  // final card sits mid-screen — instead of clinging until the deck ends. */
  function setupServicesHeader() {
    if (!hasST || reduce) return;
    var svc  = document.querySelector('.svc');
    var head = document.querySelector('.svc__pin .section-head');
    var deck = document.querySelector('.svc__deck');
    if (!svc || !head || !deck) return;
    var cards = deck.querySelectorAll('.svc__card');
    if (!cards.length) return;
    var last = cards[cards.length - 1];

    function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }

    var sEnter = 0, sRelease = 0, deckPinned = false;
    function measure() {
      // read the resolved sticky offset while CSS sticky is still in effect, then take over
      head.style.position = '';
      head.style.transform = 'none';
      var offset = parseFloat(getComputedStyle(head).top) || 80;        // --svc-head-top, resolved
      // Pin the first card just BELOW the held header so the header never covers it.
      deck.style.setProperty('--deck-top', (offset + head.offsetHeight + 16) + 'px');
      var offsetLast = parseFloat(getComputedStyle(last).top) || offset; // last card's pinned top, resolved
      sEnter   = docTop(head) - offset;          // scroll where the header reaches the top
      sRelease = docTop(last) - offsetLast;      // scroll where the LAST card finishes pinning
      if (sRelease < sEnter) sRelease = sEnter;
      head.style.position = 'relative';
      head.style.top = 'auto';        // cancel the CSS sticky `top:72px`, else relative pos shifts it onto card 1
      head.style.zIndex = '6';
      head.style.willChange = 'transform';
      deckPinned = false;
    }
    function apply() {
      var y = window.scrollY || window.pageYOffset;
      var t = y <= sEnter ? 0 : (y >= sRelease ? sRelease - sEnter : y - sEnter);
      head.style.transform = t ? 'translateY(' + t + 'px)' : 'none';
      // Once the header is actually held, pin the first card to its REAL rendered bottom
      // (bulletproof against any measurement drift) so it never sits under the header.
      if (!deckPinned && t > 0) {
        var b = head.getBoundingClientRect().bottom;
        if (b > 0) { deck.style.setProperty('--deck-top', Math.round(b + 16) + 'px'); deckPinned = true; }
      }
    }

    measure(); apply();
    window.addEventListener('scroll', apply, { passive: true });   // fires for native + Lenis scroll
    ScrollTrigger.create({
      trigger: svc, start: 'top bottom', end: 'bottom top',
      onUpdate: apply, onRefresh: function () { measure(); apply(); }
    });
  }

  /* ---------------- Split text into characters (keeps element boundaries) ---------------- */
  function wrapChars(node) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {                                  // text → one span per char
        var text = child.textContent;
        for (var i = 0; i < text.length; i++) {
          var c = text.charAt(i);
          if (c === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
          var s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
          frag.appendChild(s);
        }
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

  /* ---------------- Impact: pinned letter reveal + font-morphing "rast" ---------------- */
  function setupImpact() {
    var sec = document.getElementById('impact');
    if (!sec) return;
    var title = sec.querySelector('.impact__title');
    if (!title) return;

    var frag = wrapChars(title);
    title.innerHTML = '';
    title.appendChild(frag);

    // "rast" cycles through many fonts, forever (skip if reduced-motion).
    var morph = document.getElementById('rastMorph');
    if (morph && !reduce) {
      var fonts = [
        "'Bricolage Grotesque', sans-serif",
        "'Playfair Display', serif",
        "'Pacifico', cursive",
        "'Bebas Neue', sans-serif",
        "'Archivo Black', sans-serif",
        "'DM Serif Display', serif",
        "'Space Mono', monospace",
        "'Caveat', cursive"
      ];
      var fi = 0, morphTimer = null;
      function startMorph() {
        if (morphTimer) return;
        morphTimer = setInterval(function () {
          fi = (fi + 1) % fonts.length;
          morph.style.fontFamily = fonts[fi];
        }, 130);
      }
      function stopMorph() { if (morphTimer) { clearInterval(morphTimer); morphTimer = null; } }
      // Only cycle while the section is on screen (saves work / avoids needless relayout).
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { en[0].isIntersecting ? startMorph() : stopMorph(); }, { threshold: 0 }).observe(sec);
      } else {
        startMorph();
      }
    }

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

  var VERT = [
    'uniform float uTime;uniform vec2 uMouse;uniform float uForce;uniform float uSize;uniform float uDpr;uniform float uGather;',
    'attribute float aScale;varying float vH;',
    SNOISE,
    'void main(){',
    '  vec3 p=position;',
    '  float e=snoise(p.xy*0.16+vec2(uTime*0.13,uTime*0.09));',
    '  e+=0.4*snoise(p.xy*0.46+vec2(-uTime*0.11,uTime*0.06));',
    '  float d=distance(p.xy,uMouse);',
    '  e+=smoothstep(3.2,0.0,d)*uForce*1.5;',
    '  p.z+=e;vH=e;',
    '  p*=1.0-0.96*uGather;',   // scroll pulls every point toward the centre
    '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
    '  gl_PointSize=uSize*aScale*uDpr*(10.0/-mv.z);',
    '  gl_Position=projectionMatrix*mv;}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uColorA;uniform vec3 uColorB;varying float vH;',
    'void main(){',
    '  vec2 c=gl_PointCoord-0.5;float dd=dot(c,c);if(dd>0.25)discard;',
    '  float a=smoothstep(0.25,0.0,dd);',
    '  float t=smoothstep(-0.6,1.3,vH);',
    '  vec3 col=mix(uColorA,uColorB,t);',
    '  gl_FragColor=vec4(col,a*(0.30+0.62*t));}'
  ].join('\n');

  function setupHero3D() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas || !window.THREE || reduce) { setupCanvas(); return; }
    var THREE = window.THREE, renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { setupCanvas(); return; }

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(dpr);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9);

    var small = Math.min(window.innerWidth, window.innerHeight) < 640;
    var SX = small ? 26 : 34, SY = small ? 18 : 24;
    var segX = small ? 76 : 112, segY = small ? 48 : 74;
    var geo = new THREE.PlaneGeometry(SX, SY, segX, segY);

    var n = geo.attributes.position.count, scales = new Float32Array(n);
    for (var i = 0; i < n; i++) scales[i] = 0.7 + Math.random() * 0.9;
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    var uniforms = {
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(999, 999) },
      uForce:  { value: 0 },
      uSize:   { value: small ? 2.1 : 2.7 },
      uDpr:    { value: dpr },
      uGather: { value: 0 },
      uColorA: { value: new THREE.Color(0xff4a2e) },
      uColorB: { value: new THREE.Color(0xf4f0e9) }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var points = new THREE.Points(geo, mat);
    points.rotation.x = -Math.PI * 0.5 * 0.86;
    scene.add(points);

    var ray = new THREE.Raycaster();
    var normal = new THREE.Vector3(0, 0, 1).applyEuler(points.rotation).normalize();
    var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, points.position);
    var ndc = new THREE.Vector2(), hit = new THREE.Vector3();
    var targetForce = 0;
    var clock = new THREE.Clock();
    var raf = null, running = false;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        points.worldToLocal(hit);
        uniforms.uMouse.value.set(hit.x, hit.y);
        targetForce = 1;
      }
    }
    function frame() {
      uniforms.uTime.value += clock.getDelta();
      uniforms.uForce.value += (targetForce - uniforms.uForce.value) * 0.07;
      targetForce *= 0.95;
      var hh = (heroEl && heroEl.offsetHeight) || window.innerHeight;
      var prog = Math.min(1, Math.max(0, (window.pageYOffset || 0) / hh));
      var g = Math.min(1, prog * 3.2);    // gather much faster
      uniforms.uGather.value = g;
      camera.position.z = 9 + prog * 2.6;
      camera.position.y = 4.2 - prog * 1.3;
      camera.lookAt(0, g * 8.0, 0);       // sink far lower → points drop toward / into the next section
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; clock.start(); frame(); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }

    resize();
    window.addEventListener('resize', resize);
    if (heroEl) {
      heroEl.addEventListener('mousemove', onMove);
      heroEl.addEventListener('mouseleave', function () { uniforms.uMouse.value.set(999, 999); });
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }, { threshold: 0 })
        .observe(heroEl || canvas);
    }
    start();
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
    setupStudioHandoff();
    setupImpact();
    setupProcess();
    setupServices();
    setupScrollVideo();
    if (hasST) ScrollTrigger.refresh();
  }

  function init() {
    try {
      if (window.THREE && !reduce) setupHero3D();
      else setupCanvas();
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
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    setTimeout(function () { ScrollTrigger.refresh(); }, 350);
  });
  setTimeout(finishLoader, 4500);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
