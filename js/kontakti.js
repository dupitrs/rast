/* ============================================================
   rast — contact page (/kontakti)
   Load-in, the orb flying out of the title's dot, the budget track,
   service preselect from ?pakalpojums=, and the Web3Forms submit.
   Standalone: no dependencies. Without JS the form still renders
   (it just can't submit through fetch).
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('kp-js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------- Header: solid bar once scrolled ---------------- */
  var head = document.getElementById('kpHead');
  function onScroll() { if (head) head.classList.toggle('is-scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toTop = document.getElementById('toTop');
  if (toTop) toTop.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------------- Orb: grows out of the period in "lapu." ---------------- */
  var orb = document.getElementById('kpOrb');
  var dot = document.getElementById('kpDot');
  function orbFromDot() {
    if (!orb || !dot) return;
    if (reduceMotion || !orb.animate) { dot.classList.add('is-left'); return; }
    var o = orb.getBoundingClientRect();
    var d = dot.getBoundingClientRect();
    // the period glyph's visual dot sits low in its box — aim at its lower third
    var dx = (d.left + d.width * 0.5) - (o.left + o.width / 2);
    var dy = (d.top + d.height * 0.78) - (o.top + o.height / 2);
    var s = Math.max(0.01, (d.width * 0.32) / o.width);
    orb.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', offset: 0.18 },
      { transform: 'none' }
    ], { duration: 1900, delay: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'backwards' });
    // the dot leaves the title at the moment the orb starts to move
    setTimeout(function () { dot.classList.add('is-left'); }, 700 + 1900 * 0.18);
  }

  function ready() {
    requestAnimationFrame(function () {
      root.classList.add('is-ready');
      document.body.classList.add('is-ready');
      orbFromDot();
    });
  }
  if (document.fonts && document.fonts.ready) {
    // wait for Bricolage so the dot's position is measured on the real glyphs (cap at 1.2 s)
    var started = false;
    var go = function () { if (!started) { started = true; ready(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 1200);
  } else {
    ready();
  }

  /* ---------------- Form ---------------- */
  var form = document.getElementById('kpForm');
  if (!form) return;
  var statusEl = document.getElementById('kStatus');
  var submitBtn = form.querySelector('[type="submit"]');
  var done = document.getElementById('kpDone');
  var submitting = false;

  // Budget track fill follows the chosen stop
  var budget = document.getElementById('kBudget');
  function syncBudget() {
    if (!budget) return;
    var stops = budget.querySelectorAll('input');
    var picked = -1;
    Array.prototype.forEach.call(stops, function (r, i) { if (r.checked) picked = i; });
    budget.style.setProperty('--fill', picked < 0 ? 0 : ((picked + 0.5) / stops.length) * 100);
    budget.setAttribute('data-picked', picked < 0 ? 'false' : 'true');
  }
  if (budget) { budget.addEventListener('change', syncBudget); syncBudget(); }

  // Preselect a service from the link that brought the visitor here (?pakalpojums=Mājaslapas)
  try {
    var want = new URLSearchParams(location.search).get('pakalpojums');
    if (want) {
      Array.prototype.forEach.call(form.querySelectorAll('input[name="Pakalpojums"]'), function (c) {
        if (c.value === want) c.checked = true;
      });
    }
  } catch (err) { /* old browser: no preselect */ }

  var STR = {
    missing: 'Lūdzu, aizpildi vārdu, e-pastu un dažus teikumus par projektu.',
    email: 'Šķiet, e-pasta adresē ir kļūda.',
    sending: 'Sūtām...',
    failed: 'Neizdevās nosūtīt. Pamēģini vēlreiz vai raksti uz hello@raststudio.lv.'
  };
  function setStatus(text, err) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'kp-status' + (err ? ' is-err' : '');
  }

  Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
    el.addEventListener('input', function () { if (el.value.trim()) el.classList.remove('is-invalid'); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;

    // Validate the three required fields by hand (novalidate keeps the browser bubbles away)
    var firstBad = null;
    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
      var bad = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
      el.classList.toggle('is-invalid', bad);
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      setStatus(firstBad.type === 'email' && firstBad.value.trim() ? STR.email : STR.missing, true);
      firstBad.focus();
      return;
    }

    // Several ticked services → one readable line in the e-mail
    var fd = new FormData(form);
    var services = fd.getAll('Pakalpojums');
    fd.delete('Pakalpojums');
    fd.set('Pakalpojums', services.length ? services.join(', ') : '-');

    submitting = true;
    form.setAttribute('aria-busy', 'true');
    if (submitBtn) submitBtn.disabled = true;
    setStatus(STR.sending);

    var controller = window.AbortController ? new AbortController() : null;
    var timeout = setTimeout(function () { if (controller) controller.abort(); }, 15000);
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd, signal: controller ? controller.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) {
        if (!json || !json.success) throw new Error((json && json.message) || 'error');
        form.reset();
        syncBudget();
        setStatus('');
        form.hidden = true;
        if (done) {
          done.hidden = false;
          var card = document.getElementById('kpCard');
          if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 100, behavior: reduceMotion ? 'auto' : 'smooth' });
          done.focus({ preventScroll: true });
        }
      })
      .catch(function () { setStatus(STR.failed, true); })
      .then(function () {
        clearTimeout(timeout);
        submitting = false;
        form.removeAttribute('aria-busy');
        if (submitBtn) submitBtn.disabled = false;
      });
  });
})();
