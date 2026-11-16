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

  if (!hasST || reduce) html.classList.add('no-anim');           // CSS fallback: reveal everything
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
      var delta = y - lastY;
      if (y <= 600 || menuOpen || header.contains(document.activeElement)) header.classList.remove('header--hidden');
      else if (Math.abs(delta) > 6) header.classList.toggle('header--hidden', delta > 0);
    }
    if (scrollBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (max > 0 ? Math.max(0, Math.min(100, (y / max) * 100)) : 0) + '%';
    }
    if (Math.abs(y - lastY) > 6 || y <= 0) lastY = y;
  }
  window.addEventListener('scroll', function () { if (!lenis) onScroll(window.scrollY); }, { passive: true });
  onScroll(0);

  /* ---------------- Mobile menu ---------------- */
  var toggle = document.getElementById('navToggle');
  var menu   = document.getElementById('menu');

  var activeOverlay = null;
  var overlayBackground = [];
  var menuLabel = toggle && toggle.getAttribute('aria-label');

  function syncScrollLock() {
    html.classList.toggle('overlay-open', !!activeOverlay);
    if (lenis) activeOverlay ? lenis.stop() : lenis.start();
  }
  function activateOverlay(panel) {
    activeOverlay = panel;
    panel.inert = false;
    // Keep the mobile close button available, but exclude other header links.
    var background = [].slice.call(body.children);
    if (panel === menu && header) {
      background = background.filter(function (el) { return el !== header; });
      background = background.concat([].slice.call(header.children));
    }
    overlayBackground = background.filter(function (el) {
      return el !== panel && el !== toggle && !el.inert && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName);
    });
    overlayBackground.forEach(function (el) { el.inert = true; });
    syncScrollLock();
  }
  function deactivateOverlay(panel) {
    if (activeOverlay !== panel) return;
    overlayBackground.forEach(function (el) { el.inert = false; });
    overlayBackground = [];
    activeOverlay = null;
    panel.inert = true;
    syncScrollLock();
  }
  document.addEventListener('keydown', function (e) {
    if (!activeOverlay || e.key !== 'Tab') return;
    var items = [].slice.call(activeOverlay.querySelectorAll('a[href], button, input, textarea, select, [tabindex="0"]'));
    if (activeOverlay === menu && toggle) items.unshift(toggle);
    items = items.filter(function (el) { return !el.disabled && el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length; });
    var first = items[0], last = items[items.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || items.indexOf(document.activeElement) < 0)) {
      e.preventDefault(); last.focus({ preventScroll: true });
    } else if (!e.shiftKey && (document.activeElement === last || items.indexOf(document.activeElement) < 0)) {
      e.preventDefault(); first.focus({ preventScroll: true });
    }
  });
  function openMenu() {
    if (!menu || !toggle) return;
    menu.classList.add('is-open'); toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false');
    var labels = { lv: 'Aizvērt izvēlni', en: 'Close menu', ru: 'Закрыть меню' };
    toggle.setAttribute('aria-label', labels[document.documentElement.lang] || labels.lv);
    if (header) header.classList.remove('header--hidden');
    activateOverlay(menu);
    menu.scrollTop = 0;
    var first = menu.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(restoreFocus) {
    if (!menu || !toggle || !menu.classList.contains('is-open')) return;
    deactivateOverlay(menu);
    menu.classList.remove('is-open'); toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', menuLabel);
    if (restoreFocus) toggle.focus({ preventScroll: true });
    menu.setAttribute('aria-hidden', 'true');
  }
  if (toggle && menu) toggle.addEventListener('click', function () {
    menu.classList.contains('is-open') ? closeMenu(true) : openMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeOverlay === menu) closeMenu(true);
  });
  window.matchMedia('(min-width: 881px)').addEventListener('change', function (e) {
    if (e.matches) closeMenu(true);
  });

  /* ---------------- UI strings (lapas valoda no <html lang>; noklusējums LV) ---------------- */
  var PAGE_LANG = (document.documentElement.lang || 'lv').slice(0, 2).toLowerCase();
  var UI_STRINGS = {
    lv: {
      pickService: 'Lūdzu, izvēlies pakalpojumu.',
      sending: 'Nosūtām…',
      sent: 'Paldies! Ziņa nosūtīta. Atbildēsim vienas darba dienas laikā.',
      failed: 'Ziņu neizdevās nosūtīt. Mēģini vēlreiz vai raksti uz hello@raststudio.lv.'
    },
    en: {
      pickService: 'Please choose a service.',
      sending: 'Sending…',
      sent: 'Thank you! Your enquiry is on its way - we\'ll reply soon.',
      failed: 'Something went wrong. Please try again or write to hello@raststudio.lv'
    },
    ru: {
      pickService: 'Пожалуйста, выбери услугу.',
      sending: 'Отправляем…',
      sent: 'Спасибо! Заявка отправлена — скоро ответим.',
      failed: 'Не получилось отправить. Попробуй ещё раз или напиши на hello@raststudio.lv'
    }
  };
  var STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.lv;

  /* ---------------- Project form modal (Web3Forms — no backend) ---------------- */
  (function setupContactForm() {
    var modal = document.getElementById('formModal');
    var form  = document.getElementById('projectForm');
    if (!modal || !form) return;
    var serviceInput = document.getElementById('fService');
    var statusEl   = form.querySelector('.form__status');
    var submitBtn  = form.querySelector('[type="submit"]');
    var lastFocus  = null;
    var submitting = false;

    /* ---- Custom service dropdown ---- */
    var cs = document.getElementById('fServiceSelect');
    var csBtn = cs && cs.querySelector('.cselect__btn');
    var csValue = cs && cs.querySelector('.cselect__value');
    var csList = cs && cs.querySelector('.cselect__list');
    var csOpts = cs ? cs.querySelectorAll('.cselect__opt') : [];
    var csPlaceholder = csValue ? csValue.textContent : 'Izvēlies pakalpojumu';
    function csOpen() {
      if (!cs) return;
      cs.classList.add('is-open'); csBtn.setAttribute('aria-expanded', 'true');
      var selected = cs.querySelector('[aria-selected="true"]') || csOpts[0];
      if (selected) {
        selected.focus({ preventScroll: true });
        selected.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
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
      csList.id = 'fServiceOptions';
      csBtn.setAttribute('aria-controls', csList.id);
      csBtn.setAttribute('aria-labelledby', 'fServiceLabel fServiceValue');
      csValue.id = 'fServiceValue';
      Array.prototype.forEach.call(csOpts, function (o) { o.tabIndex = -1; o.setAttribute('aria-selected', 'false'); });
      cs.addEventListener('keydown', function (e) {
        var index = Array.prototype.indexOf.call(csOpts, document.activeElement);
        if (e.key === 'Escape' && cs.classList.contains('is-open')) {
          e.preventDefault(); e.stopPropagation(); csClose(); csBtn.focus({ preventScroll: true });
        } else if (e.key === 'Tab') {
          csClose(); csBtn.focus({ preventScroll: true });
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(e.key) >= 0) {
          e.preventDefault();
          if (!cs.classList.contains('is-open')) { csOpen(); return; }
          var next = e.key === 'Home' ? 0 : e.key === 'End' ? csOpts.length - 1 :
            Math.max(0, Math.min(csOpts.length - 1, index + (e.key === 'ArrowUp' ? -1 : 1)));
          csOpts[next].focus({ preventScroll: true });
          csOpts[next].scrollIntoView({ block: 'nearest' });
        } else if ((e.key === 'Enter' || e.key === ' ') && index >= 0) {
          e.preventDefault(); csOpts[index].click();
        }
      });
      csBtn.addEventListener('click', function (e) { e.stopPropagation(); cs.classList.contains('is-open') ? csClose() : csOpen(); });
      Array.prototype.forEach.call(csOpts, function (o) {
        o.addEventListener('click', function () { csSet(o.getAttribute('data-value')); csClose(); csBtn.focus(); });
      });
      document.addEventListener('click', function (e) { if (!cs.contains(e.target)) csClose(); });
    }

    function openForm(service) {
      lastFocus = document.activeElement;
      if (service) csSet(service);
      closeMenu();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      activateOverlay(modal);
      modal.querySelector('.form').scrollTop = 0;
      var first = form.querySelector('input:not([type=hidden]):not(.form__hp), select, textarea');
      if (first) first.focus({ preventScroll: true });
    }
    function closeForm() {
      csClose();
      modal.classList.remove('is-open');
      deactivateOverlay(modal);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
      modal.setAttribute('aria-hidden', 'true');
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

    if (new URLSearchParams(location.search).get('project') === '1') {
      openForm();
      var entryUrl = new URL(location.href);
      entryUrl.searchParams.delete('project');
      history.replaceState(history.state, '', entryUrl.pathname + entryUrl.search + entryUrl.hash);
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.hasAttribute && e.target.hasAttribute('data-close'))) closeForm();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeForm();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;
      if (!serviceInput.value) {                       // custom dropdown isn't a native field → validate manually
        if (statusEl) { statusEl.textContent = STR.pickService; statusEl.className = 'form__status is-err'; }
        csOpen();
        return;
      }
      if (statusEl) { statusEl.textContent = STR.sending; statusEl.className = 'form__status is-sending'; }
      submitting = true;
      form.setAttribute('aria-busy', 'true');
      if (submitBtn) submitBtn.disabled = true;
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 15000);
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form), signal: controller.signal })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (json) {
          if (json && json.success) {
            if (statusEl) { statusEl.textContent = STR.sent; statusEl.className = 'form__status is-ok'; }
            form.reset();
            csSet('');
          } else {
            throw new Error((json && json.message) || 'error');
          }
        })
        .catch(function () {
          if (statusEl) { statusEl.textContent = STR.failed; statusEl.className = 'form__status is-err'; }
        })
        .finally(function () {
          clearTimeout(timeout); submitting = false; form.removeAttribute('aria-busy');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  })();

  /* ---------------- Anchor navigation + history ---------------- */
  function hashTarget(hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch (err) { return null; }
  }
  function scrollToPosition(y) {
    if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
    else window.scrollTo({ top: y, behavior: 'instant' });
    onScroll(window.scrollY);
  }
  function anchorY(target) {
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight + 16 : 16));
  }
  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', function () { target.removeAttribute('tabindex'); }, { once: true });
    }
    target.focus({ preventScroll: true });
  }
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
      if (a.classList.contains('js-open-form')) return;
      var hash = a.getAttribute('href');
      if (hash === '#') { e.preventDefault(); return; }
      var target = hashTarget(hash);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      restorationDone = true;
      savePosition();
      var y = anchorY(target);
      if (Math.abs(window.scrollY - y) > 2 || location.hash) {
        // Keep section navigation in history without exposing fragments in the URL.
        try { history.pushState(positionState(y, ''), '', location.pathname + location.search); } catch (err) { }
      }
      focusTarget(target);
      if (lenis) lenis.scrollTo(y, { duration: 1, onComplete: savePosition });
      else window.scrollTo({ top: y, behavior: reduce ? 'instant' : 'smooth' });
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
    // copy/: the soft shadows behind the hero copy come in with their text (hero-scrim.css); once
    // the lines have slid in, their reveal clip is lifted
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: function () {
      if (heroEl) heroEl.classList.add('is-intro-done');
      gsap.set('.hero__title .line > span', { clearProps: 'transform,top' });   // no stacking context left: each word's shadow sits under every word, not over the line above
    } });
    // NB: y:0 in the from-state is load-bearing. The CSS pre-hide is
    // translateY(110%), which GSAP imports as PIXELS (percentages are already
    // resolved in computed style); animating only yPercent would leave that
    // pixel offset behind and the title would stay clipped forever.
    // copy/: the big words slide on `top` (hero-scrim.css says why), the rest as before
    var heroLead = document.querySelector('.hero--solutions .hero__lead');
    var heroWords = gsap.utils.toArray('.hero--solutions .hero__word > span');
    var otherLines = gsap.utils.toArray('.hero__title .line > span').filter(function (el) { return heroWords.indexOf(el) < 0; });
    var leadAt = heroWords.length * 0.12;
    if (heroWords.length) tl.fromTo(heroWords, { top: '2.2em' }, { top: '0em', duration: 1.1, stagger: 0.12 }, 0);
    tl.fromTo(otherLines, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.1, stagger: 0.12 }, leadAt);
    if (heroLead) tl.fromTo(heroLead, { '--scrim': 0 }, { '--scrim': 1, duration: 0.9, ease: 'power2.out' }, leadAt);
    tl.fromTo(heroReveals, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, '-=0.7');
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
        // A jump to Contact must not queue its content behind every skipped section.
        var visible = batch.filter(function (el) { return el.getBoundingClientRect().bottom > 0; });
        var passed = batch.filter(function (el) { return visible.indexOf(el) < 0; });
        if (passed.length) gsap.set(passed, { opacity: 1, y: 0 });
        gsap.fromTo(visible, { opacity: 0, y: 28 }, {
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

    // "Mūsu darbi" — the same slide-up as the hero headline, played once on scroll.
    var workLines = document.querySelectorAll('.work__big-title .line > span');
    if (workLines.length) {
      gsap.fromTo(workLines, { y: 0, yPercent: 110 }, {
        y: 0, yPercent: 0, duration: 1.1, ease: 'power4.out',
        scrollTrigger: { trigger: '.work__big-title', start: 'top 85%', once: true }
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
    // dot + link colours follow the palette (copy/js/palette.js)
    var dotCol = 'rgba(244,240,233,0.55)', linkRgb = '255,74,46';
    function recolor() {
      if (!window.rastPalette) return;
      var c = window.rastPalette.colors().intro, hx = function (h) { var n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); };
      dotCol = 'rgba(' + hx(c.ink) + ',0.55)'; linkRgb = hx(c.accent);
    }
    recolor();
    window.addEventListener('rast:palette', recolor);

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
        ctx.fillStyle = dotCol; ctx.fill();
      }
      for (var a = 0; a < parts.length; a++) {
        for (var b = a + 1; b < parts.length; b++) {
          var ddx = parts[a].x - parts[b].x, ddy = parts[a].y - parts[b].y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < LINK) {
            ctx.beginPath();
            ctx.moveTo(parts[a].x, parts[a].y); ctx.lineTo(parts[b].x, parts[b].y);
            ctx.strokeStyle = 'rgba(' + linkRgb + ',' + (1 - dist / LINK) * 0.16 + ')';
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

  /* ---------------- Process: sticky number + scrolling chapters ---------------- */
  // Desktop (CSS ≥861px): the left column (title + a huge faint chapter number) is
  // CSS-sticky while the chapters scroll past on the right. JS only builds the decorative
  // extras — the number reel and a clickable chapter index — and marks which chapter is
  // in view. Mobile/reduced/no-JS: the plain list stays as is.
  function setupProcess() {
    if (!hasST || reduce) return;
    var section = document.getElementById('process');
    var listEl = document.getElementById('processList');
    var head = section && section.querySelector('.process__head');
    var steps = gsap.utils.toArray('.step');
    if (!section || !listEl || !head || !steps.length) return;

    // Rolling number: every chapter's number stacked in a reel behind a 1em window
    var big = document.createElement('div');
    big.className = 'process__big';
    big.setAttribute('aria-hidden', 'true');
    var reel = document.createElement('span');
    reel.className = 'process__big-reel';
    big.appendChild(reel);
    head.appendChild(big);

    // Chapter index above the chapters (a duplicate of their titles → hidden from AT)
    var body = document.createElement('div');
    body.className = 'process__body';
    var index = document.createElement('ol');
    index.className = 'process__index';
    index.setAttribute('aria-hidden', 'true');
    listEl.parentNode.insertBefore(body, listEl);
    body.appendChild(index);
    body.appendChild(listEl);

    var rows = steps.map(function (step) {
      var num = step.getAttribute('data-step');
      var digit = document.createElement('span');
      digit.textContent = num;
      reel.appendChild(digit);

      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.setAttribute('data-cursor', 'hover');
      btn.innerHTML = '<span class="process__index-num">' + num + '</span>';
      btn.appendChild(document.createTextNode(step.querySelector('.step__title').textContent));
      btn.addEventListener('click', function () {
        // Land the chapter just past the activation line so it lights up on arrival
        var y = Math.max(0, step.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3);
        if (lenis) lenis.scrollTo(y, { duration: 1.1 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      });
      li.appendChild(btn);
      index.appendChild(li);
      return li;
    });

    var current = -1;
    function setActive(i) {
      if (i === current) return;
      current = i;
      reel.style.transform = 'translateY(' + (-i) + 'em)';
      for (var k = 0; k < steps.length; k++) {
        steps[k].classList.toggle('is-active', k === i);
        rows[k].classList.toggle('is-active', k === i);
      }
    }

    // Active = the last chapter whose top has crossed 60% of the screen. Read from the
    // layout on every update (not per-step toggles), so a jump straight past the section
    // (menu link, restored position) still leaves the right number showing.
    function sync() {
      var line = window.innerHeight * 0.6, i = 0;
      for (var k = 1; k < steps.length; k++) if (steps[k].getBoundingClientRect().top <= line) i = k;
      setActive(i);
    }
    section.classList.add('is-flow');
    ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onUpdate: sync, onRefresh: sync });
    sync();
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
    var cards = deck.querySelectorAll('.svc__card');
    var catalogue = deck.closest('.svc--catalogue');
    var titles = [];
    if (catalogue) {
      Array.prototype.forEach.call(cards, function (card, i) {
        var title = card.querySelector('.svc__lead'), next = cards[i + 1];
        if (title && next) titles.push({ card: card, el: title, slot: title.parentElement,
          content: card.querySelector('.svc__card-aside'), next: next });
      });
    }
    function measure() {
      if (catalogue) {
        // copy/: only the cards pin; the section heading scrolls away normally.
        deck.style.removeProperty('--deck-top');
      } else {
        var offset = parseFloat(getComputedStyle(head).top) || 96;   // resolved sticky top
        deck.style.setProperty('--deck-top', Math.round(offset + head.offsetHeight + 18) + 'px');
      }
      // Telefonā visas kārtis pinojas vienā augstumā (pilnīgs pārklājums, sk. CSS), tāpēc
      // garākās kārts apakša izlīstu zem nākamās. Nomērām dabiskos augstumus un izlīdzinām
      // visas uz garāko. Vispirms noņemam mainīgo, citādi mērītu iepriekšējo izlīdzinājumu.
      deck.style.removeProperty('--card-h');
      var desktop = window.innerWidth > 760;
      if (!desktop) {
        var tallest = 0;
        Array.prototype.forEach.call(cards, function (c) { tallest = Math.max(tallest, c.offsetHeight); });
        if (tallest) deck.style.setProperty('--card-h', Math.ceil(tallest) + 'px');
      }
      titles.forEach(function (t) {
        t.scale = Math.min(1, parseFloat(getComputedStyle(t.slot).fontSize) / parseFloat(getComputedStyle(t.el).fontSize));
        t.peek = desktop ? parseFloat(getComputedStyle(t.next).top) - parseFloat(getComputedStyle(t.card).top) : 0;
        var inset = t.slot.getBoundingClientRect().top - t.card.getBoundingClientRect().top;
        t.shift = desktop ? (t.peek - t.el.offsetHeight * t.scale) / 2 - inset : 0;
        t.progress = -1;
      });
      onScroll();
    }
    // Sadaļas beigās pēdējā kārts aizslīd pāri piestiprinātajam virsrakstam. Kārts to nosedz,
    // bet tās noapaļotie stūri ir caurspīdīgi, tāpēc stūrī pavīdēja virsraksta burts ("K"
    // stūrītis). Tāpēc virsrakstu izdzēšam tieši tad, kad kārts pār to aizslīd: caurspīdība
    // seko kārts augšmalai, tā ka līdz brīdim, kad kārts virsrakstu sedz, tas jau ir izdzisis.
    var last = cards.length ? cards[cards.length - 1] : null;
    var FADE = 48, lastOp = -1;            // dzišanas ceļš (px), kamēr kārts augšmala noiet virsrakstam pāri
    var queued = false;
    function syncCover() {
      queued = false;
      // Start at the bottom of the body content, then ease the same heading into
      // the visible strip. Stable layout boxes keep this reversible without jumps.
      var progress = titles.map(function (t) {
        var bottom = t.content.getBoundingClientRect().bottom;
        var travel = bottom - t.card.getBoundingClientRect().top - t.peek;
        var p = travel > 0 && !html.classList.contains('no-anim') ?
          Math.max(0, Math.min(1, (bottom - t.next.getBoundingClientRect().top) / travel)) : 0;
        return p * p * (3 - 2 * p);
      });
      titles.forEach(function (t, i) {
        if (progress[i] === t.progress) return;
        t.progress = progress[i];
        t.el.style.setProperty('--title-scale', 1 + (t.scale - 1) * t.progress);
        t.el.style.setProperty('--title-y', (t.shift * t.progress) + 'px');
      });
      if (!last || catalogue) return;
      var h = head.getBoundingClientRect(), c = last.getBoundingClientRect();
      var op = Math.max(0, Math.min(1, (c.top - h.top) / FADE));
      if (op === lastOp) return;
      lastOp = op;
      head.style.opacity = op === 1 ? '' : op;
    }
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(syncCover); } }

    measure();
    syncCover();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); syncCover(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);   // fonti maina teksta augstumu
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

  /* ---------------- Impact: pinned letter reveal + font-morphing "rast" ---------------- */
  function setupImpact() {
    var sec = document.getElementById('impact');
    if (!sec) return;
    var title = sec.querySelector('.impact__title');
    if (!title) return;

    var frag = wrapChars(title);
    title.innerHTML = '';
    title.appendChild(frag);

    var morph = document.getElementById('rastMorph');
    if (morph && !reduce) setupRastMorph(morph, sec);

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

  /* ---------------- "rast" font morph ----------------
     The word cycles through display faces while the impact section is on screen.
     The decorative families are deliberately NOT in the page's font links: the
     document still loads with two families only, and these are fetched the first
     time the section comes near. Phones get the same effect, not a heavier load. */
  var MORPH_FONTS = [
    ["'Bricolage Grotesque', sans-serif", ''],                          // already loaded
    ["'Playfair Display', serif",          '700 100px "Playfair Display"'],
    ["'Pacifico', cursive",                '400 100px "Pacifico"'],
    ["'Bebas Neue', sans-serif",           '400 100px "Bebas Neue"'],
    ["'Archivo Black', sans-serif",        '400 100px "Archivo Black"'],
    ["'DM Serif Display', serif",          '400 100px "DM Serif Display"'],
    ["'Caveat', cursive",                  '700 100px "Caveat"']
    // Space Mono is deliberately absent: it is the widest of the set and pushed "rast?"
    // onto a third line on 320px phones, which made the whole title jump mid-cycle.
  ];
  var MORPH_CSS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700' +
                  '&family=Pacifico&family=Bebas+Neue&family=Archivo+Black&family=Caveat:wght@700' +
                  '&family=DM+Serif+Display:ital@0;1&display=swap';
  // RU lapā morphojamais vārds ir kirilicā, bet puse latīņu komplekta (Bricolage,
  // Bebas Neue, Archivo Black, DM Serif Display) kirilicu neatbalsta — burti kristu
  // uz vienveidīgiem fallback fontiem un cikls izskatītos salauzts. Tāpēc RU savs
  // saraksts ar līdzīgiem raksturiem, kuriem Google Fonts ir kirilicas apakškopa.
  if (PAGE_LANG === 'ru') {
    MORPH_FONTS = [
      ["'Inter Tight', sans-serif",   ''],                              // jau ielādēts (RU display fonts)
      ["'Playfair Display', serif",   '700 100px "Playfair Display"'],
      ["'Pacifico', cursive",         '400 100px "Pacifico"'],
      ["'Oswald', sans-serif",        '600 100px "Oswald"'],            // kondensēts ~ Bebas Neue
      ["'Russo One', sans-serif",     '400 100px "Russo One"'],         // smags ~ Archivo Black
      ["'Yeseva One', serif",         '400 100px "Yeseva One"'],        // dekoratīvs serifs ~ DM Serif
      ["'Caveat', cursive",           '700 100px "Caveat"']
    ];
    MORPH_CSS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700' +
                '&family=Pacifico&family=Oswald:wght@600&family=Russo+One' +
                '&family=Yeseva+One&family=Caveat:wght@700&display=swap';
  }
  var morphFontsReady = null;

  function loadMorphFonts(word) {
    if (morphFontsReady) return morphFontsReady;
    morphFontsReady = new Promise(function (res) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MORPH_CSS;
      link.onload = link.onerror = res;                  // resolve either way: a blocked CDN
      document.head.appendChild(link);                   // just means the cycle uses fallbacks
      setTimeout(res, 4000);                             // ...and never hangs
    }).then(function () {
      // A webfont file is only fetched once something renders in it, so ask for each face
      // up front - otherwise the first pass through the list flashes fallback glyphs.
      if (!document.fonts || !document.fonts.load) return;
      var jobs = [];
      MORPH_FONTS.forEach(function (f) {
        if (f[1]) jobs.push(document.fonts.load(f[1], word || 'rast'));
      });
      return Promise.all(jobs)['catch'](function () { });
    })['catch'](function () { });
    return morphFontsReady;
  }

  function setupRastMorph(el, sec) {
    var i = 0, timer = null, near = false, locked = false;

    // Every face is a different width, and the title is centred on phones - so without
    // this the whole line ("tu vēlies rast?") slid left and right on every swap. Lock the
    // box to the widest face and centre the glyphs inside it: the line now never moves.
    // Measured in em, so the lock still holds when the fluid font-size changes on resize.
    function lockWidth() {
      if (locked) return;
      var fs = parseFloat(getComputedStyle(el).fontSize);
      if (!fs) return;
      var prev = el.style.fontFamily, max = 0;
      el.style.width = 'auto';
      MORPH_FONTS.forEach(function (f) {
        el.style.fontFamily = f[0];
        max = Math.max(max, el.getBoundingClientRect().width);
      });
      el.style.fontFamily = prev;
      if (!max) return;
      el.style.width = ((max + 2) / fs).toFixed(3) + 'em';   // +2px: sub-pixel headroom
      locked = true;
    }

    function start() {
      if (timer || !near) return;
      loadMorphFonts(el.textContent).then(function () {
        if (!near || timer) return;                      // scrolled away while fonts loaded
        lockWidth();
        timer = setInterval(function () {
          i = (i + 1) % MORPH_FONTS.length;
          el.style.fontFamily = MORPH_FONTS[i][0];
        }, 130);
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // Only cycle while the section is on screen (saves work / avoids needless relayout).
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        near = en[0].isIntersecting;
        if (near) start(); else stop();
      }, { rootMargin: '200px' }).observe(sec);
    } else {
      near = true;
      start();
    }
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
    'varying float vH;varying float vForm;varying float vSphere;varying float vIsDot;varying float vFade;varying float vNear;',
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
    '  float ci=clamp((s*1.2-dNeck*0.022-aRand*0.2)/0.3,0.0,1.0);',   // a long, gradual stream: the nearest dots arrive quickly (the dot forms early), the far ones follow later and later
    '  float t=ci;',                                                   // linear: the same speed all the way in (no hang-then-plunge)
    '  float r1=fract(aRand*13.7)-0.5;float r2=fract(aRand*7.31);float r3=fract(aRand*29.7)-0.5;',
    '  vec3 fp=wave;',
    '  vec3 land=uDotC+aSphere*(0.12*fract(aRand*3.9));',              // landed dots pile into a tiny ROUND ball (Fibonacci directions, centre-dense) — the white dot itself
    '  fp=mix(fp,land,smoothstep(0.0,1.0,t));',                         // the WHOLE wave streams into the (itself falling) dot as one…
    '  vec2 rel=fp.xy-land.xy;float sw=7.0*t*t*(1.0-t)*(0.7+0.6*r2);',   // …swirling in like a vortex once they are close (zero turn at both ends, so the wave at rest and the landed dot are untouched)
    '  float cs=cos(sw),sn=sin(sw);fp.xy=land.xy+vec2(cs*rel.x-sn*rel.y,sn*rel.x+cs*rel.y);',
    '  fp.x+=r1*5.0*t*(1.0-t);',                                       // each dot its own sideways arc…
    '  fp.z+=r3*3.0*t*(1.0-t);',                                       // …and depth arc (zero at both ends)
    '  pos=mix(pos,fp,smoothstep(0.0,0.02,t));',
    '  float mf=smoothstep(0.02,0.15,t)*(1.0-smoothstep(0.75,0.95,t));',   // interactive the whole flight; lets go just before joining the ball
    '  vec3 rd=normalize(uMouseW-cameraPosition);',                    // repel measured from the cursor RAY, not a fixed plane —
    '  vec3 np=cameraPosition+rd*dot(pos-cameraPosition,rd);',         // so exactly the dots UNDER the cursor react, at any depth
    '  float dRay=distance(pos,np);',
    '  pos+=(pos-np)/max(dRay,0.001)*smoothstep(1.2,0.0,dRay)*uForce*0.5*mf;',
    '  vSphere=0.0;',                                                  // in-flight dots keep their colour — ALL the orange is born from the white dot
    '  vFade=1.0-smoothstep(0.9,1.0,t)*smoothstep(0.0,0.08,uGrow);',   // once the white orb is there, each dot vanishes into it as it lands; dots still on their way stay visible
    '  vIsDot=aIsDot;',   // orange amount (dot → sphere)
    '  vNear=smoothstep(0.6,1.0,t);',                                 // dots light up as they near the dot — it charges up
    '  float sm=mix(1.0,0.60,clamp(uToText,0.0,1.0));',
    '  sm=mix(sm,0.9,clamp(uToSphere,0.0,1.0));',
    '  vec4 mv=modelViewMatrix*vec4(pos,1.0);',
    '  gl_PointSize=min(uSize*aScale*uDpr*(10.0/-mv.z)*sm*(1.0+0.12*vNear),mix(1000.0,6.0*uDpr,smoothstep(0.0,0.1,t)));',   // capped once moving: a dot swung close to the camera must never become a blob (the wave at rest is untouched)
    '  gl_Position=projectionMatrix*mv;}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uColorA;uniform vec3 uColorB;uniform vec3 uGlow;',
    'varying float vH;varying float vForm;varying float vSphere;varying float vIsDot;varying float vFade;varying float vNear;',
    'void main(){',
    '  vec2 c=gl_PointCoord-0.5;float dd=dot(c,c);if(dd>0.25)discard;',
    '  float a=smoothstep(0.25,0.0,dd);',
    '  float t=smoothstep(-0.6,1.3,vH);',
    '  vec3 waveCol=mix(uColorA,uColorB,t);',
    '  float waveA=0.30+0.62*t;',
    '  vec3 formCol=mix(uGlow,uColorA,vIsDot);',   // white letters, orange dot (uGlow: palette's "white")
    '  vec3 col=mix(mix(waveCol,formCol,vForm),uGlow,vNear*0.5);',
    '  col=mix(col,uColorA,vSphere);',   // orange as it enters the dot → sphere
    '  gl_FragColor=vec4(col,min(1.0,a*mix(waveA,0.82,vForm)*(1.0+0.3*vNear))*(1.0-0.42*vSphere)*vFade);}'
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
      uDotC:     { value: new THREE.Vector3(0, -3.2, 0) },   // the dot the particles fall into (set by setLanding)
      uGrow:     { value: 0 },                               // grow progress — dissolves the landed cluster into the forming orange
      uColorA:   { value: new THREE.Color(0xff4a2e) },
      uColorB:   { value: new THREE.Color(0xf4f0e9) },
      uGlow:     { value: new THREE.Color(0xffffff) }
    };

    // copy/: accent / ink / glow come from the palette (copy/js/palette.js); .intro is the first
    // screen's set — the same as the page's, the page is dark throughout.
    var palA = [new THREE.Color(), new THREE.Color(), new THREE.Color()], palB = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
    function recolorGL() {
      if (!window.rastPalette) return;
      var c = window.rastPalette.colors(), d = c.intro;
      palA[0].set(d.accent); palA[1].set(d.ink); palA[2].set(d.glow);
      palB[0].set(c.accent); palB[1].set(c.ink); palB[2].set(c.glow);
      fadeGL();
    }
    function fadeGL() {
      var hb = heroEl ? heroEl.getBoundingClientRect().bottom : 0, vh = window.innerHeight || 1;
      var t = Math.min(1, Math.max(0, (vh * 0.9 - hb) / (vh * 0.5)));   // hero bottom 90% → 40% of the screen
      uniforms.uColorA.value.copy(palA[0]).lerp(palB[0], t);
      uniforms.uColorB.value.copy(palA[1]).lerp(palB[1], t);
      uniforms.uGlow.value.copy(palA[2]).lerp(palB[2], t);
    }
    recolorGL();
    window.addEventListener('rast:palette', recolorGL);
    window.addEventListener('scroll', fadeGL, { passive: true });

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
    var orb = document.getElementById('fxOrb');   // orange circle that grows from the dot
    // Half the orb's CSS box (720px, styles.css). Big box scaled DOWN, never a small one scaled up:
    // a 100px layer stretched to a ~650px sphere rendered blurry.
    var ORB_R = 360;
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
    var raf = null, running = false, drewEmpty = false, lastLand = -1;

    /* -------- Kling intro: the particles' landing dot IS the sequence's first frame ----------
       A frame sequence (WebP, drawn to #fxSeq), not a <video>: scrubbing a video by setting
       currentTime stutters — every seek waits on the decoder — while a decoded image draws at once.
       Geometry contract, in the render's 1920×1080 "world": all of its content stays inside the
       centre 9:16 strip x 656..1264 (wide empty margins), so the frames are just that strip
       (1080×1920) and every screen shows the same composition. Every screen fits the box the
       content actually fills over all frames (VID.box, a little margin around it) as big as it
       goes, so the smoke and the logo fill the screen without a crop. Frame black is 0 and the canvas blends
       with lighten, so the page colour shows everywhere except the smoke and the logo.
       dot0 = the sphere in the first frame, dot1 = the logo's orange dot in the last one —
       re-measure both after swapping the frames. */
    var seqEl = document.getElementById('fxSeq'), seqCtx = seqEl && seqEl.getContext('2d');
    var VID = { dot0: { x: 955, y: 279, d: 118 }, dot1: { x: 1197, y: 475, d: 55.5 }, stripX: 656, stripW: 608,
      box: { x: 692, y: 195, w: 548, h: 700 } };   // all frames' content (x 706..1226, y 219..871) plus a margin
    // The logo's dot over the last frames — [x, y, Ø] for frame END0, END0 + 1, … (it is still
    // growing). The orb fades in on top of it frame by frame, so the swap can't be seen.
    var END0 = 62, END = [[1195.8, 475.8, 43.5], [1196.5, 475.5, 45], [1196.8, 475.2, 47.5], [1197, 475.2, 49.5],
      [1197.2, 475.2, 50.5], [1197.2, 475, 52], [1197.2, 475, 53], [1197.2, 475.2, 53.5], [1197.2, 475.2, 54.5],
      [1197, 475, 55], [1197, 475.2, 55.5], [1197, 475.2, 55.5], [1197, 475.2, 55.5], [1196.8, 475.2, 55.5]];
    var ORB_IN = 66, ORB_FULL = 70;   // orb fades in over these frames; from ORB_FULL the frame's own dot is masked
    // Scroll → frame: the moving part (up to ORB_FULL) gets most of the scroll; the quiet tail (the
    // last smoke clearing off the finished logo) gets just a short stretch, so it never reads as a
    // pause — the whole section keeps one even pace.
    var TAIL = 0.12;
    function seqWarp(sp) {
      var k = ORB_FULL / (seqFrames() - 1);
      return sp < 1 - TAIL ? sp / (1 - TAIL) * k : k + (sp - (1 - TAIL)) / TAIL * (1 - k);
    }
    function dotAt(fi) {               // the logo dot at fractional frame fi, as a world point
      var t = Math.min(END.length - 1, Math.max(0, fi - END0)), i = Math.min(END.length - 2, Math.floor(t)), f = t - i;
      var A = END[i], B = END[i + 1];
      return { x: lerp(A[0], B[0], f), y: lerp(A[1], B[1], f), d: lerp(A[2], B[2], f) };
    }
    var seqImgs = [], seqShown = -1, seqMasked = false, seqOp = -1;
    // World → screen: scale + offset of the strip layout described above.
    function layout() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      // Desktop gets a closer crop; the video and travelling dot share this geometry.
      var B = VID.box, s = Math.min(w / B.w, h / B.h * (w > 880 ? 1.25 : 1));
      return { s: s, ox: w / 2 - (B.x + B.w / 2) * s, oy: h / 2 - (B.y + B.h / 2) * s };
    }
    function vpt(p) { var L = layout(); return { x: L.ox + p.x * L.s, y: L.oy + p.y * L.s, d: p.d * L.s }; }
    // The dot only ever moves DOWN the screen. Once the hero has had a moment, the whole wave
    // streams into it as one while it falls, gathering speed; it grows into the sphere on the way and reaches PT_END just as the frames take over,
    // falling exactly as fast as the sphere in them. The frames start that far down (seqLiftAt)
    // and ease up into place more slowly than the sphere falls, so it keeps going down; the logo
    // arrives centred as the frames end and then simply scrolls on with the page.
    // The dot forms at the bottom of the wave, as if beneath it (PT_START) and keeps falling relative
    // to the page — just slower than we scroll, so on screen we catch up with it (it rises at
    // PT_V0 px per scrolled px, easing off). Once caught, it falls on screen too, reaching the frames'
    // spot (PT_END) at the sphere's own falling speed (PT_V1) right at the hand-over. Cubic Hermite.
    // It waits down there while the cluster gathers (until ptT0, when it becomes visible).
    // copy/: no frames. The white dot gathers just above the screen centre and we FOLLOW it — it
    // stays put on screen (only easing down a touch) while the page scrolls on. The orange dot
    // comes up from below with the #studio stage (studio-burst.js) and runs into it: the white dot
    // sits in the orange dot's top exactly as the stage pins (vidStartY = studio top) — the strike.
    var PT_START = 0.4, PT_V0 = 0, PT_V1 = 0, ptT0 = 0;
    // On the dot's top edge (where the splash starts, studio-burst.js level), not inside it: deeper in, the
    // dot covered the drop ~30px before the strike and the scroll seemed to stall.
    function pointEnd(h) { return h * 0.5 - Math.min(window.innerWidth, window.innerHeight) * 0.08 * 0.92; }
    function pointY(y) {                                         // the dot's screen y, from the gather to the strike
      var h = canvas.clientHeight, T = Math.max(1, vidStartY - ptT0), t = clamp01((y - ptT0) / T);
      var t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * h * PT_START + (t3 - 2 * t2 + t) * PT_V0 * T
           + (-2 * t3 + 3 * t2) * pointEnd(h) + (t3 - t2) * PT_V1 * T;
    }
    function seqLiftAt(y) {                                      // how far below their place the frames are drawn
      var L = pointEnd(canvas.clientHeight) - vpt(VID.dot0).y, vp = clamp01((y - vidStartY) / Math.max(1, vidLen));
      // Linear and done by 30 % of the stretch: still slower than the sphere falls in the frames (so it keeps
      // going down), but in place before the smoke spreads, so the sphere and smoke never leave the screen
      return Math.max(0, L) * (1 - clamp01(vp / 0.3));
    }
    var zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), landNdc = new THREE.Vector2(), landRay = new THREE.Raycaster();
    function screenToWorld(sy, out) {                            // a screen y on the dot's column → the z = 0 plane
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      camera.updateMatrixWorld();
      landNdc.set(0, -(sy / h * 2 - 1));                         // the dot's column is the screen centre
      landRay.setFromCamera(landNdc, camera);
      landRay.ray.intersectPlane(zPlane, out);
    }
    function setLanding(sy) {
      screenToWorld(sy == null ? pointY(window.pageYOffset || 0) : sy, uniforms.uDotC.value);
    }
    function frameOk(im) { return im && im.complete && im.naturalWidth > 0; }
    function seqReady() { return frameOk(seqImgs[0]); }
    function setSeqOp(v) {
      if (!seqEl || v === seqOp) return;
      seqOp = v;
      seqEl.style.opacity = '' + v;
      seqEl.style.visibility = v > 0 ? 'visible' : 'hidden';
    }
    var seqLift = -1, seqPadding = 0;
    function setSeqLift(px) {                                    // moves the drawn frames up with the page
      px = Math.round(px);
      if (!seqEl || px === seqLift) return;
      seqLift = px;
      seqEl.style.transform = px ? 'translate3d(0,' + (-px) + 'px,0)' : '';
    }
    function sizeSeq() {
      if (!seqEl) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var h = canvas.clientHeight, L = layout();
      // Rasterize the full enlarged content BEFORE translating it onto the screen.
      // A viewport-sized bitmap clips the first sphere's top permanently.
      seqPadding = Math.ceil(Math.max(0, (VID.box.h * L.s - h) / 2));
      seqEl.style.top = -seqPadding + 'px';
      seqEl.style.bottom = 'auto';
      seqEl.style.height = (h + seqPadding * 2) + 'px';
      seqEl.width = Math.round(canvas.clientWidth * dpr);
      seqEl.height = Math.round((h + seqPadding * 2) * dpr);
      seqShown = -1;                                             // resizing clears the canvas — redraw
    }
    // Draw the frame at progress p (0..1); a frame still loading falls back to the nearest earlier one.
    // mask: paint the logo's own dot out (black = page colour under lighten) once the orb has taken over.
    function drawSeq(p, mask) {
      if (!seqReady()) return;
      var i = Math.round(Math.min(1, Math.max(0, p)) * (seqImgs.length - 1));
      while (i > 0 && !frameOk(seqImgs[i])) i--;
      mask = !!mask;
      if (i === seqShown && mask === seqMasked) return;
      seqShown = i; seqMasked = mask;
      var L = layout(), k = seqEl.width / canvas.clientWidth;
      seqCtx.clearRect(0, 0, seqEl.width, seqEl.height);
      seqCtx.drawImage(seqImgs[i], (L.ox + VID.stripX * L.s) * k, (L.oy + seqPadding) * k, VID.stripW * L.s * k, 1080 * L.s * k);
      if (mask) {
        var dp = dotAt(i);
        seqCtx.fillStyle = '#000';
        seqCtx.beginPath();
        seqCtx.arc((L.ox + dp.x * L.s) * k, (L.oy + seqPadding + dp.y * L.s) * k, (dp.d / 2 + 4) * L.s * k, 0, 7);
        seqCtx.fill();
      }
    }
    function seqFrames() { return seqImgs.length || (seqEl ? +seqEl.getAttribute('data-count') : 0) || 1; }
    // After the page has loaded, so ~1 MB of frames never competes with the first paint.
    function loadSeq() {
      if (!seqEl || seqImgs.length) return;
      var n = +seqEl.getAttribute('data-count') || 0, src = seqEl.getAttribute('data-src');
      for (var i = 0; i < n; i++) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () { if (this.decode) this.decode().catch(function () { }); };   // decode ahead of the scrub
        im.src = src.replace('%03d', ('00' + i).slice(-3));
        seqImgs.push(im);
      }
    }
    if (seqEl) {
      sizeSeq();
      if (document.readyState === 'complete') setTimeout(loadSeq, 300);
      else window.addEventListener('load', function () { setTimeout(loadSeq, 300); });
    }

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
      sizeSeq();
      setLanding();
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
    var aTop = 0, aH = 0, suckStart = 0, suckLen = 1, orbInY = 1e9, swellStart = 1e9, swellLen = 1, vidStartY = 1e9, vidLen = 1,
        holdStartY = 1e9, fadeLen = 1, fadeA = 1, fadeB = 1, travelStartY = 1e9;
    function measure() {
      var a = document.getElementById('assembly'), vh = window.innerHeight;
      aTop = a ? a.offsetTop : vh;
      aH = a ? a.offsetHeight : vh;
      // Fully scroll-driven and overlapping, always moving down the screen (see pointY): from the
      // first scrolled pixel the particles fall into a low, falling dot; it swells into the first
      // frame's sphere and the sequence starts playing right there, easing up into place while the
      // sphere keeps falling (seqLiftAt) → it scrubs on (sphere falls, smoke, logo, smoke clears)
      // → the orb takes over the logo's dot and sets
      // off while "rast" scrolls away with the page, #studio rising right behind it (the
      // .assembly height brings it in just as the logo is done). Lengths in screens.
      // copy/: the gather runs almost up to the strike — the farthest dots land a quarter screen
      // before the white drop meets the orange dot (#studio pins), so it flies the last bit alone.
      var stEl = document.getElementById('studio');               // it overlaps the hero's foot (copy CSS), so read it directly
      var strikeY = stEl ? stEl.offsetTop : aTop + aH;
      var farNeck = Math.sqrt((SX / 2) * (SX / 2) + (SY / 2 + 9) * (SY / 2 + 9));
      var farFrac = Math.min(1, (farNeck * 0.022 + 0.2 + 0.3) / 1.2);   // share of the gather when the farthest dot lands (ci = 1 in the shader)
      suckStart = 0; suckLen = Math.max(1, (strikeY - vh * 0.25) / farFrac);
      // A small white orb takes over the cluster once it has formed and falls on, still that small,
      // while the rest of the dots stream in; only when the last is in does it grow (the swell).
      orbInY = suckStart + suckLen * 0.33;
      ptT0 = suckStart + suckLen * 0.25;                      // the cluster becomes visible — the catch-up starts
      // The swell starts the moment the farthest dot lands — a little before the strike.
      swellStart = suckStart + suckLen * farFrac; swellLen = Math.max(1, strikeY - swellStart);
      // copy/ (no frames): the white drop keeps easing down to the screen centre and arrives
      // exactly as #studio pins, where the traveller takes over — parked there for the burst.
      travelStartY = holdStartY = vidStartY = strikeY;
      vidLen = 1; fadeLen = vh * 0.3;
      fadeA = swellStart + swellLen; fadeB = fadeA + vh * 0.1;   // the particles are all in the dot by now
      buildStops();
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ez(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // The small dot appears where the particles suck in; scrolling then grows it into the full sphere.
    // Stores its last output (gx/gy/gd/go) so the traveller can take over seamlessly.
    var gx = null, gy = null, gd = null, go = null;
    // NOTE: no canvas-fade factor here. That fade belongs to the particle canvas; multiplying it
    // into the orb made the finished sphere sit at ~0.9 opacity for the last stretch of the grow,
    // and a semi-transparent orb reads GREY (the white ink layer stops inverting the backdrop
    // fully, so the multiply lands on a dim, desaturated base). The orb is opaque until the
    // traveller's own opacity keyframes take over.
    function clamp01(v) { return Math.min(1, Math.max(0, v)); }
    // On-screen diameter of the landed particle cluster (ball radius 0.12 world, centre-dense, plus
    // the point size), so the orb can take over at exactly that size.
    var cA = new THREE.Vector3(), cB = new THREE.Vector3();
    var HAND = 0.015;   // share of the frames' stretch the first frame holds while the orb fades onto it — kept tiny, it's a stop
    function clusterD() {
      cA.copy(uniforms.uDotC.value).project(camera);
      cB.copy(uniforms.uDotC.value); cB.x += 0.12; cB.project(camera);
      return Math.abs(cB.x - cA.x) * canvas.clientWidth * 0.8 + 3;
    }
    function updateOrb(y) {
      if (y < orbInY) {                                           // the cluster is still forming — no orb yet
        if (orb.style.opacity !== '0') orbCss('opacity', '0');
        return;
      }
      // copy/ (no frames). The cluster's white orb IS the drop: small and white, held on the
      // screen's centre column (pointY) until the orange dot rises into it.
      var cx2 = canvas.clientWidth / 2, cy2 = pointY(y), dia = clusterD(), ow = 1, halo = 1;
      var oA = clamp01((y - orbInY) / (suckLen * 0.06));
      gx = cx2; gy = cy2; gd = dia; go = 0;                       // the traveller starts hidden: the drop is spent in the strike
      // Flat (no blend) the whole time: blending would invert the white cluster and the letters.
      orbFlat(true);
      orb.classList.add('is-white');                              // copy CSS: white overlay (--ow) over the orange
      orb.style.setProperty('--oj', '1');
      orb.style.setProperty('--od', '0');
      orb.style.setProperty('--ow', '' + ow);
      orb.style.setProperty('--halo', '' + halo);
      orbCss('transform', 'translate(' + (cx2 - ORB_R) + 'px,' + (cy2 - ORB_R) + 'px) scale(' + (dia / (2 * ORB_R)) + ')');
      orbCss('opacity', '' + oA);
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
      // copy/: the traveller starts where the gather left the dot — centred, D(16), as #studio pins.
      var K = [{ y: travelStartY, xf: 0.5, yf: 0.5, px: D(16), op: 0.0 }];   // the drop has struck — no orb from here
      // #studio is a sticky burst stage (copy/js/studio-burst.js): the orb parks at the screen
      // centre at the dot's size, D(16), and vanishes at data-burst-at, where the stage's own dot
      // takes over and bursts open. Keep the size in step with R0 in studio-burst.js.
      var burstY = null;
      if (st != null) {
        var stEl = document.getElementById('studio');
        burstY = st + Math.max(0, stH - vh) * (parseFloat(stEl.getAttribute('data-burst-at')) || 0.06);
      }
      // The journey ends in the studio burst — the orb only lives at the start of the page
      // (hero → gather → burst) and is gone for the rest of it, on every screen size.
      if (st != null) {
        K.push({ y: Math.max(burstY, travelStartY + 1), xf: 0.5, yf: 0.5, px: D(16), op: 0.0 });   // stays gone through the burst
      }
      faqZone = [1e9, 1e9];   // no FAQ follow — the journey is already over by then
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
      // Damping eases in from none at the handoff: right after the logo the orb is locked to the
      // scroll, so scrolling back up lands it exactly on the logo's dot — no lag, no snap.
      var lock = 1 - clamp01((y - travelStartY) / (window.innerHeight * 0.6));
      dX = damp(dX, tx, lerp(0.05, 1, lock), lock > 0 ? 0 : 1.6); dY = damp(dY, ty, lerp(0.05, 1, lock), lock > 0 ? 0 : 1.6);   // speed ∝ distance, with a floor
      dP = damp(dP, px, lerp(0.06, 1, lock), 0);  dO = damp(dO, op, lerp(0.08, 1, lock), 0);
      var zi = '800';
      // z-index 1 = ABOVE every section background (bodies/panels paint at z:auto/0, incl. the OPAQUE
      // #studio panel) but BEHIND the cards (svc__card is z-index 2). So the sphere is always visible
      // over the black bg AND always tucked behind the cards — never vanishes into black, never on top.
      if (y > svcZone[0] && y < svcZone[1]) zi = '1';
      else if (y > wkZone[0] && y < wkZone[1]) zi = '-1';     // behind the work cards — never over the photos
      else if (y > insZone[0] && y < insZone[1]) zi = '1';    // behind the article cards (z-index 2) but OVER the plain section text
      orbCss('zIndex', zi);
      orbFlat(seqOp > 0);                                     // flat while the logo fades out under it, then blending back on (sphere passes over text)
      orb.classList.remove('is-white');
      orb.style.setProperty('--oj', '1');                     // travelling orb is always fully orange (even after an instant jump mid-collect)
      orbCss('transform', 'translate(' + (dX - ORB_R) + 'px,' + (dY - ORB_R) + 'px) scale(' + (dP / (2 * ORB_R)) + ')');
      orbCss('opacity', '' + dO);
    }
    // SINGLE writer for the orb, both phases (grow + travel) — two competing writers at the
    // handoff caused a visible stutter. Always-on so it keeps running after the WebGL stops.
    (function orbLoop() {
      if (orb) {
        var y = window.pageYOffset || 0;
        if (y >= travelStartY) {
          orb.style.setProperty('--od', '0');                    // copy/: already the shaded brand dot
          travelOrb(y);
        }
        else {
          dX = null;                                             // next takeover re-syncs from the grow output
          if (orb.style.zIndex !== '800') orbCss('zIndex', '800');   // an instant jump up (Ctrl+F, scrollbar flick) must not keep a card-zone z-index
          updateOrb(y);
        }
      }
      requestAnimationFrame(orbLoop);
    })();

    // Visibility must follow scroll even while offscreen rendering is paused.
    // History restoration can jump past both observed intro sections in one frame.
    function syncCanvasVisibility() {
      var y = window.pageYOffset || 0;
      canvas.style.opacity = '' + (1 - Math.min(1, Math.max(0, (y - fadeA) / Math.max(1, fadeB - fadeA))));
    }
    window.addEventListener('scroll', syncCanvasVisibility, { passive: true });
    window.addEventListener('pageshow', function () {
      requestAnimationFrame(function () { measure(); syncCanvasVisibility(); });
    });
    if (hasST) ScrollTrigger.addEventListener('refresh', syncCanvasVisibility);

    function frame() {
      var dt = Math.min(clock.getDelta(), 0.05);
      uniforms.uTime.value += dt;
      uniforms.uForce.value += (targetForce - uniforms.uForce.value) * 0.07;
      targetForce *= 0.95;

      var y = window.pageYOffset || 0;

      // "rast" stage DROPPED (uToText stays 0): the wave drains down, then funnels into the dot
      var suckP = Math.min(1, Math.max(0, (y - suckStart) / suckLen));
      uniforms.uToSphere.value = suckP;
      var ly = pointY(y);                                        // the dot falls the whole time
      if (ly !== lastLand) { lastLand = ly; setLanding(ly); }    // the dot scrolls up with #assembly
      // uGrow = the swell: the cluster dissolves into the white sphere over the whole swell (the
      // shader fades the particles out across uGrow 0..0.08)
      uniforms.uGrow.value = 0.08 * Math.min(1, Math.max(0, (y - orbInY) / (suckLen * 0.06)));   // "orb is there" — from now on landed dots vanish into it
      // camera stays FIXED on the hero landscape view — the platform never changes perspective

      // fade the particle canvas as #studio rises (the orb itself is driven solely by orbLoop)
      syncCanvasVisibility();

      // Through the long video stretch every particle is faded out — draw that empty frame once,
      // then stop re-rendering it every frame.
      var empty = y >= swellStart + swellLen;                     // particles fully faded into the sphere
      if (!empty || !drewEmpty) renderer.render(scene, camera);
      drewEmpty = empty;
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; clock.start(); frame(); } }
    function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }

    resize(); measure(); syncCanvasVisibility();
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
    if (!setupWave3D(canvas, heroEl)) {
      // No WebGL sequence → no orb or intro video either: collapse their empty scroll stretch.
      document.documentElement.classList.add('no-fx');
      setupCanvas(canvas, heroEl);
    }
  }

  /* ---------------- Preloader ---------------- */
  var loader = document.getElementById('loader');
  var loaderDone = false;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    if (loader) loader.classList.add('is-done');
    body.style.overflow = '';
    syncScrollLock();
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
    if (!loader || reduce || savedPosition()) { finishLoader(); return; }
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
    restoreInitialPosition();
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
      syncScrollLock();
      scenesBuilt = true;
      restoreInitialPosition();
      if (window.console) console.warn('rast init:', err);
    }
  }

  // Hard safety: drop loader no matter what
  window.addEventListener('load', finishLoader);
  // Positions belong to individual history entries, so different visits never
  // overwrite one another. No persistent storage or personal form data is needed.
  var restorationDone = false;
  var saveTimer = 0;
  var pageLoaded = document.readyState === 'complete';
  function savedPosition() {
    var pos = history.state && history.state.rastScroll;
    return pos && pos.path === location.pathname + location.search && pos.hash === location.hash &&
      Number.isFinite(pos.y) && pos.y >= 0 ? pos : null;
  }
  function positionState(y, hash) {
    return Object.assign({}, history.state, {
      rastScroll: { path: location.pathname + location.search, hash: hash, y: y }
    });
  }
  function savePosition() {
    clearTimeout(saveTimer);
    if (!restorationDone) return;
    try {
      history.replaceState(positionState(window.scrollY, location.hash), '');
    } catch (err) { /* Native navigation still works if history is restricted. */ }
  }
  function restorePosition() {
    var pos = savedPosition(), target = hashTarget(location.hash);
    if (hasST) ScrollTrigger.refresh();
    scrollToPosition(pos ? pos.y : target ? anchorY(target) : 0);
    // Incoming links still accept #work etc.; consume the destination, then clean the URL.
    if (target) {
      try { history.replaceState(positionState(window.scrollY, ''), '', location.pathname + location.search); } catch (err) { }
    }
    if (hasST) ScrollTrigger.update();
  }
  function restoreInitialPosition() {
    if (restorationDone || !scenesBuilt || !pageLoaded) return;
    requestAnimationFrame(function () {
      if (restorationDone) return;
      finishLoader();
      restorePosition();
      restorationDone = true;
      savePosition();
    });
  }
  window.addEventListener('load', function () {
    pageLoaded = true;
    restoreInitialPosition();
  });
  setTimeout(function () { pageLoaded = true; finishLoader(); restoreInitialPosition(); }, 4500);
  // A slow resource must never drag a visitor back after they start interacting.
  function cancelInitialRestore(e) {
    if (e.type === 'keydown' && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(e.key) < 0) return;
    if (loaderDone) restorationDone = true;
  }
  ['wheel', 'touchstart', 'keydown'].forEach(function (event) {
    window.addEventListener(event, cancelInitialRestore, { passive: true });
  });
  window.addEventListener('scroll', function () {
    clearTimeout(saveTimer);
    if (restorationDone) saveTimer = setTimeout(savePosition, 150);
  }, { passive: true });
  window.addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) savePosition();
    else if (hasGSAP) gsap.ticker.wake();
  });
  window.addEventListener('popstate', function () {
    clearTimeout(saveTimer);
    if (!restorationDone) return;
    restorePosition();
  });
  window.addEventListener('hashchange', function () {
    if (restorationDone) { restorePosition(); savePosition(); }
  });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    if (hasGSAP) gsap.ticker.wake();
    syncScrollLock();
    restorePosition();
    restorationDone = true;
  });
  // Expanding FAQ answers changes every later scene's geometry.
  var layoutTimer;
  Array.prototype.forEach.call(document.querySelectorAll('.faq__item'), function (item) {
    item.addEventListener('toggle', function () {
      clearTimeout(layoutTimer);
      layoutTimer = setTimeout(function () {
        if (lenis) lenis.resize();
        if (hasST) ScrollTrigger.refresh();
        onScroll(window.scrollY);
      }, reduce ? 0 : 400);
    });
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
    var ORB_ABOVE_ONLY = '.svc__card, .insight, .work__card, .studio';   // work names sit ON the photos now
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
