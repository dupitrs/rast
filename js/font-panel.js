// copy/: font pair picker. Every option swaps the headline AND the body font at once
// (--font-display + --font-sans). The four pairs Raivis picked; each font was checked against
// Google Fonts: it exists with the listed weights and its files contain every Latvian letter
// (ā č ē ģ ī ķ ļ ņ š ū ž, both cases).
// [ and ] step through the pairs; the panel can be dragged by its pill or title bar.
// The choice and the panel's place are remembered in this browser.
(function () {
  'use strict';

  // The site's own pair: not in the list, only behind the "Oriģinālais" button.
  var ORIG = ['Oriģinālais', 'Bricolage Grotesque', 'Inter'];
  // [group, headline font, body font]
  var PAIRS = [
    ['Izvēlētie', 'Outfit', 'Inter'],
    ['Izvēlētie', 'Bungee', 'Inter'],
    ['Izvēlētie', 'Lexend Deca', 'Lexend'],
    ['Izvēlētie', 'Schibsted Grotesk', 'Karla']
  ];
  // Weights each font really has (from 400–800), so the Google Fonts request never fails.
  var W = {
    'Outfit': '400;500;600;700;800',
    'Bungee': '400',
    'Lexend Deca': '400;500;600;700;800',
    'Lexend': '400;500;600;700;800',
    'Schibsted Grotesk': '400;500;600;700;800',
    'Karla': '400;500;600;700;800',
    'Inter': '400;500;600;700;800'
  };
  var KEY = 'rast-copy-font-pair';
  var root = document.documentElement;
  var cur = -1, token = 0;                          // -1 = the site's own pair

  function keyOf(p) { return p[1] + ' / ' + p[2]; }
  function stack(name) { return "'" + name + "', system-ui, sans-serif"; }
  function famParam(name) { return 'family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@' + W[name]; }

  function apply(i, save) {
    cur = i < 0 ? -1 : i % PAIRS.length;
    var p = cur < 0 ? ORIG : PAIRS[cur], my = ++token;
    render();
    if (save) { try { localStorage.setItem(KEY, keyOf(p)); } catch (e) {} }
    if (cur < 0) { reset(); return; }
    var link = document.getElementById('fpFonts');
    if (!link) { link = document.createElement('link'); link.id = 'fpFonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    var fams = p[1] === p[2] ? [p[1]] : [p[1], p[2]];
    link.href = 'https://fonts.googleapis.com/css2?' + fams.map(famParam).join('&') + '&display=swap';
    toggle.classList.add('is-loading');
    // Swap only once both faces are in, so stepping through pairs never flashes a fallback.
    var ready = Promise.all([
      document.fonts.load('700 1em "' + p[1] + '"', 'MājaslapasĀŽ'),
      document.fonts.load('400 1em "' + p[2] + '"', 'MājaslapasĀŽ')
    ]);
    var timeout = new Promise(function (r) { setTimeout(r, 3000); });
    link.onload = function () {
      Promise.race([ready, timeout]).catch(function () {}).then(function () {
        if (my !== token) return;                     // a newer choice has taken over
        root.style.setProperty('--font-display', stack(p[1]));
        root.style.setProperty('--font-sans', stack(p[2]));
        root.style.fontSynthesis = 'none';            // single-weight fonts: no fake bold
        toggle.classList.remove('is-loading');
        fitHero();
        window.dispatchEvent(new Event('resize'));    // let scroll-driven sections re-measure
      });
    };
  }
  function reset() {
    root.style.removeProperty('--font-display');
    root.style.removeProperty('--font-sans');
    root.style.fontSynthesis = '';
    var link = document.getElementById('fpFonts');
    if (link) link.remove();
    toggle.classList.remove('is-loading');
    fitHero();
    window.dispatchEvent(new Event('resize'));
  }
  // The hero headline is sized for Bricolage; a wider face would run off the screen
  // (its lines don't wrap). Shrink it just enough to fit — the site's own pair is untouched.
  function fitHero() {
    var title = document.querySelector('.hero__title');
    if (!title) return;
    title.style.fontSize = '';
    if (cur < 0) return;
    var worst = 1;
    Array.prototype.forEach.call(title.querySelectorAll('.line > span'), function (sp) {
      var box = sp.parentElement.clientWidth, w = sp.scrollWidth;
      if (box && w > box) worst = Math.min(worst, box / w);
    });
    if (worst < 1) title.style.fontSize = (parseFloat(getComputedStyle(title).fontSize) * worst * 0.98).toFixed(1) + 'px';
  }
  var fitTimer;
  function fitSoon() { clearTimeout(fitTimer); fitTimer = setTimeout(fitHero, 150); }
  window.addEventListener('resize', function (e) { if (e.isTrusted) fitSoon(); });   // not our own nudge
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitSoon);

  // ---------------- panel ----------------
  var box = document.createElement('div');
  box.className = 'fp';
  box.setAttribute('data-lenis-prevent', '');
  box.innerHTML =
    '<button type="button" class="fp__toggle" aria-expanded="false" aria-controls="fpPanel">' +
      '<span class="fp__aa" aria-hidden="true">Aa</span><span>Fonti</span><b class="fp__count"></b></button>' +
    '<div class="fp__panel" id="fpPanel" role="dialog" aria-label="Fontu pāri" hidden>' +
      '<div class="fp__head"><strong>Fontu pāri</strong><span class="fp__total"></span>' +
        '<button type="button" class="fp__close" aria-label="Aizvērt">×</button></div>' +
      '<input class="fp__search" type="search" placeholder="Meklēt fontu…" aria-label="Meklēt fontu">' +
      '<div class="fp__now"></div>' +
      '<div class="fp__list" role="listbox" aria-label="Fontu pāri"></div>' +
      '<div class="fp__foot">' +
        '<button type="button" class="fp__prev" aria-label="Iepriekšējais pāris">‹</button>' +
        '<button type="button" class="fp__next" aria-label="Nākamais pāris">›</button>' +
        '<button type="button" class="fp__reset">Oriģinālais</button>' +
        '<button type="button" class="fp__copy">Kopēt nosaukumu</button></div>' +
      '<p class="fp__hint">Taustiņi <kbd>[</kbd> un <kbd>]</kbd> pārslēdz pārus arī ar aizvērtu paneli. Paneli var pārvilkt aiz šīs joslas augšā vai aiz pogas.</p>' +
    '</div>';
  document.body.appendChild(box);
  var toggle = box.querySelector('.fp__toggle'), panel = box.querySelector('.fp__panel');
  var list = box.querySelector('.fp__list'), search = box.querySelector('.fp__search');
  var now = box.querySelector('.fp__now'), count = box.querySelector('.fp__count');
  box.querySelector('.fp__total').textContent = PAIRS.length;

  var items = [], groupEls = [], lastGroup = null;
  PAIRS.forEach(function (p, i) {
    if (p[0] !== lastGroup) {
      lastGroup = p[0];
      var h = document.createElement('p'); h.className = 'fp__group'; h.textContent = p[0];
      list.appendChild(h); groupEls.push(h);
    }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fp__item'; b.setAttribute('role', 'option');
    b.innerHTML = '<span class="fp__n">' + (i + 1) + '</span><span class="fp__d"></span><span class="fp__b"></span>';
    b.querySelector('.fp__d').textContent = p[1];
    b.querySelector('.fp__b').textContent = p[1] === p[2] ? 'tā pati saime' : '+ ' + p[2];
    b.addEventListener('click', function () { apply(i, true); });
    b._g = groupEls[groupEls.length - 1]; b._q = (p[0] + ' ' + p[1] + ' ' + p[2]).toLowerCase();
    list.appendChild(b); items.push(b);
  });

  function render() {
    var p = cur < 0 ? ORIG : PAIRS[cur];
    count.textContent = cur < 0 ? 'oriģinālie' : (cur + 1) + '/' + PAIRS.length;
    now.innerHTML = '<span>Virsraksti</span><b></b><span>Teksts</span><b></b>';
    var bs = now.querySelectorAll('b'); bs[0].textContent = p[1]; bs[1].textContent = p[2];
    items.forEach(function (it, i) { it.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    if (!panel.hidden && cur >= 0) items[cur].scrollIntoView({ block: 'nearest' });
  }
  function open(on) {
    panel.hidden = !on;
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) return;
    place();
    if (cur >= 0) items[cur].scrollIntoView({ block: 'center' });
    // Straight into the search box with a mouse; on touch screens that would pop up the keyboard.
    if (window.matchMedia('(pointer: fine)').matches) search.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', function () { open(panel.hidden); });
  box.querySelector('.fp__close').addEventListener('click', function () { open(false); toggle.focus(); });
  // Step through the list; from the site's own pair, ] starts at the first and [ at the last.
  function step(d) { apply(cur < 0 ? (d > 0 ? 0 : PAIRS.length - 1) : (cur + d + PAIRS.length) % PAIRS.length, true); }
  box.querySelector('.fp__prev').addEventListener('click', function () { step(-1); });
  box.querySelector('.fp__next').addEventListener('click', function () { step(1); });
  box.querySelector('.fp__reset').addEventListener('click', function () { apply(-1, true); });
  var copyBtn = box.querySelector('.fp__copy');
  copyBtn.addEventListener('click', function () {
    var text = keyOf(cur < 0 ? ORIG : PAIRS[cur]);
    var done = function () { copyBtn.textContent = 'Nokopēts'; setTimeout(function () { copyBtn.textContent = 'Kopēt nosaukumu'; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  });
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase(), shown = new Set();
    items.forEach(function (it) { var hit = !q || it._q.indexOf(q) !== -1; it.hidden = !hit; if (hit) shown.add(it._g); });
    groupEls.forEach(function (g) { g.hidden = !shown.has(g); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { open(false); toggle.focus(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) return;
    if (e.key === ']') { e.preventDefault(); step(1); }
    else if (e.key === '[') { e.preventDefault(); step(-1); }
  });

  // ---------------- dragging: by the "Aa Fonti" pill or the panel's title bar ----------------
  var POS_KEY = 'rast-copy-font-panel-pos', pos = null, drag = null, justDragged = false;
  function clampPos(x, y) {
    var r = toggle.getBoundingClientRect();
    return [Math.max(8, Math.min(window.innerWidth - r.width - 8, x)), Math.max(8, Math.min(window.innerHeight - r.height - 8, y))];
  }
  function place() {
    if (pos) {
      var c = clampPos(pos[0], pos[1]);
      box.style.left = c[0] + 'px'; box.style.top = c[1] + 'px'; box.style.bottom = 'auto';
    }
    if (drag && drag.moved) return;                  // keep the panel's side steady mid-drag
    // Open the panel on whichever side of the pill has more room, and never past the screen.
    var r = toggle.getBoundingClientRect(), H = window.innerHeight;
    var below = H - r.bottom > r.top;
    box.classList.toggle('fp--below', below);
    box.classList.toggle('fp--right', r.left + 368 > window.innerWidth);
    panel.style.maxHeight = Math.max(220, Math.min(620, (below ? H - r.bottom : r.top) - 18)) + 'px';
  }
  function startDrag(e) {
    if (e.button !== 0 || e.target.closest('.fp__close')) return;
    var r = box.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    // Follow the pointer on the whole window: a quick first move leaves the handle at once.
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 5) return;   // still a click
    if (!drag.moved) { drag.moved = true; box.classList.add('is-dragging'); }
    e.preventDefault();
    // The box's own top-left is the pill's top-left (the panel hangs off it absolutely).
    pos = clampPos(e.clientX - drag.dx, e.clientY - drag.dy);
    place();
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (drag.moved) {
      justDragged = true; setTimeout(function () { justDragged = false; }, 0);
      box.classList.remove('is-dragging');
      drag = null; place();
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch (err) {}
    }
    drag = null;
  }
  [toggle, box.querySelector('.fp__head')].forEach(function (h) { h.addEventListener('pointerdown', startDrag); });
  // A drag that ends on the pill must not also open/close the panel.
  toggle.addEventListener('click', function (e) { if (justDragged) e.stopImmediatePropagation(); }, true);
  try { pos = JSON.parse(localStorage.getItem(POS_KEY)); } catch (e) {}
  if (!Array.isArray(pos)) pos = null;
  place();
  window.addEventListener('resize', place);

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var start = -1;
  if (saved) PAIRS.forEach(function (p, i) { if (keyOf(p) === saved) start = i; });
  apply(start, false);
})();
