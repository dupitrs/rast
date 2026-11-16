/* ============================================================
   rast — studio burst (copy/ page only)
   #studio: the travelling orb parks at the centre of the sticky stage (see buildStops in
   main.js) and hands over to the canvas dot at data-burst-at. A drop falls in, the vessel's top
   shoots up into a tube, a beam shoots up out of the liquid and splits into two rippling
   walls; then the view dives in and the questions people come to us with unfold from the
   centre: the main needs big and bright in the middle, specific tasks smaller and dimmer
   further out. All of it is scrubbed by scroll, so scrolling back up rewinds it — except the
   quieter questions: once the two loud lines are in, those follow on a timer.
   No GSAP or reduced motion → main.js sets .no-anim and the CSS shows the section static.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------------- #studio: the dot tears open into a rift ---------------- */
  // The opening is scrubbed by scroll: o (0..1) is the stage's progress from data-burst-at
  // to OPEN_END — exactly, both ways:
  //   0.00      the white drop (the orb, main.js) strikes the waiting dot: splash, half full
  //   0.03–0.30 the vessel's top shoots up past the screen into a tube
  //   0.24–0.42 a thin beam shoots up out of the liquid
  //   0.38–0.60 the beam widens into a V that fills the tube
  //   0.55–1.00 the V splits down the middle; its halves slide apart into the walls while the
  //             tube spreads into a wide V. The walls' inner edges ripple all the time.
  // Then (OPEN_END..DIVE_END) the funnel opens up further and the liquid sinks away, while
  // (CLOUD_START..CLOUD_END) the questions unfold. As the next section comes up the walls
  // straighten and settle flush with the screen edges for the whole section, then slide off as it ends.
  // Everything is drawn on one fixed canvas, positioned from window.scrollY read in the same
  // frame (no ScrollTrigger lag), with the same viewport maths as the orb in main.js.
  function setupBurst() {
    var sec = document.getElementById('studio');
    if (!sec || !sec.classList.contains('burst')) return;
    var cv = sec.querySelector('.burst__fx');
    var ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    var qs = sec.querySelector('.burst__qs');
    var header = document.getElementById('header');
    // List order follows service priority: broad needs first, specific tasks last.
    var Q = Array.prototype.map.call(sec.querySelectorAll('.bq'), function (el) {
      var m = /\bbq--(\d)\b/.exec(el.className);
      return { el: el, t: el.querySelector('.bq__t'), tier: m ? +m[1] : 4, x: 0, y: 0, w: 0, h: 0, s: 0, d: 0.2, r: -1, out: true, at: 0, c: 0, tp: 0 };
    });
    // The walls frame whichever section follows the stage, then peel away as it ends.
    var after = sec.nextElementSibling || sec;
    var html = document.documentElement;
    var AT = parseFloat(sec.getAttribute('data-burst-at'));
    if (isNaN(AT)) AT = 0.06;
    // Timeline in screens of pinned scroll. Section 290svh (CSS) → RANGE_H = 1.9 screens: the
    // opening 0.7; then the dive 0.52 (0.3 on phones, see measure) and, alongside it, the
    // questions 1.08; then only a sliver of hold — a long hold read as the page stopping before
    // the next section comes up.
    var RANGE_H = 1.9;
    var OPEN_END = 0.7 / RANGE_H, DIVE_END = 1.22 / RANGE_H, CLOUD_START = OPEN_END, CLOUD_END = 1.78 / RANGE_H;

    var CREAM = '#F4F0E9', ACC = '#FF4A2E', SOFT = '#FF6A4D', DEEP = '#C9341C', WASH = '#17171C';
    // Shades derived from the four above (recolor() rebuilds them from the palette — copy/js/palette.js).
    // The ratios reproduce the original hand-picked hexes: ACC_DK '#E23C20', DEEP_DK '#8E2414', …
    var ACC_DK, ACC_DKR, DEEP_DK, ACC_HI, ACC_LINE, TIP, WASH_RGB, CREAM_RGB, SOFT_RGB, ACC_RGB, ORB0, ORB1, ORB2;
    // Outside the walls, outermost first. w = thickness in vmin.
    var OUTER = [
      { fill: WASH, role: 'wash', w: 8.5, wave: 1.6 },     // soft wash with a lazy, wobbling edge (fades out — see draw)
      { fill: DEEP, role: 'deep', w: 2.4 },                // deep orange
      { fill: CREAM, w: 0.45 }                             // cream hairline
    ];
    // rgb() of a mix of two '#rrggbb' colours — the walls' shading grows in as they split
    function mixHex(a, b, t, al) {
      var A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16), f = function (s) { return Math.round(lerp((A >> s) & 255, (Bc >> s) & 255, t)); };
      return 'rgba(' + f(16) + ',' + f(8) + ',' + f(0) + ',' + (al == null ? 1 : al) + ')';
    }
    function hexMix(a, b, t) {                     // '#rrggbb' between two '#rrggbb' colours
      var A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16), f = function (s) { return Math.round(lerp((A >> s) & 255, (Bc >> s) & 255, t)); };
      return '#' + ((1 << 24) | (f(16) << 16) | (f(8) << 8) | f(0)).toString(16).slice(1);
    }
    function rgbOf(h) { var n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
    function hash(j) { var s = Math.sin(j * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); }
    var OUTER_AT = OUTER.map(function (o, i) { var a = 0; for (var k = i; k < OUTER.length; k++) a += OUTER[k].w; return a; });
    // Liquid, top layer first; each lower layer covers the one above from its own surface down.
    var LIQ = [
      { fill: CREAM, d: 0.00, a: 0.09, k: 1.0, v: 0.9, ph: 0 },     // thin cream crest…
      { fill: SOFT, dark: ACC, d: 0.035, a: 0.09, k: 1.0, v: 0.9, ph: 0 },     // …riding the same wave
      { fill: ACC, dark: '#E23C20', d: 0.30, a: 0.10, k: 0.8, v: 0.55, ph: 3.4 },
      { fill: DEEP, dark: '#8E2414', d: 0.62, a: 0.08, k: 1.1, v: -0.45, ph: 5.1 }
    ];
    function recolor() {
      var c = window.rastPalette ? window.rastPalette.colors() : null;
      if (c && /^#[0-9A-F]{6}$/.test(c.accent)) {
        CREAM = c.ink; ACC = c.accent; SOFT = c.accentSoft; DEEP = c.accentDeep;
        // the wash is a shadow: the palette's raised surface (≈ the original #17171C on dark grounds)
        WASH = c.surface2;
      }
      ACC_DK = hexMix(ACC, DEEP, 0.53); ACC_DKR = hexMix(ACC, DEEP, 0.7); DEEP_DK = hexMix(DEEP, '#000000', 0.3);
      ACC_HI = hexMix(ACC, '#FFFFFF', 0.25); ACC_LINE = hexMix(ACC, '#FFFFFF', 0.75); TIP = rgbOf(hexMix(ACC, '#FFFFFF', 0.92));
      WASH_RGB = rgbOf(WASH); CREAM_RGB = rgbOf(CREAM); SOFT_RGB = rgbOf(SOFT); ACC_RGB = rgbOf(ACC);
      // the stand-in dot is drawn ×0.96, like the blend pair renders the sphere over a dark ground
      ORB0 = hexMix(SOFT, '#000000', 0.04); ORB1 = hexMix(ACC, '#000000', 0.04); ORB2 = hexMix(DEEP, '#000000', 0.04);
      OUTER[0].fill = WASH; OUTER[1].fill = DEEP; OUTER[2].fill = CREAM;
      LIQ[0].fill = CREAM; LIQ[1].fill = SOFT; LIQ[1].dark = ACC;
      LIQ[2].fill = ACC; LIQ[2].dark = ACC_DK; LIQ[3].fill = DEEP; LIQ[3].dark = DEEP_DK;
    }
    recolor();
    window.addEventListener('rast:palette', recolor);

    // Per-side sample buffers (reused every frame — no garbage while it animates).
    var MAXN = 480;
    function buf() { return { x: new Float32Array(MAXN + 1), y: new Float32Array(MAXN + 1), nx: new Float32Array(MAXN + 1), ny: new Float32Array(MAXN + 1), a: new Float32Array(MAXN + 1), n: 0, len: 0 }; }
    var SIDES = [buf(), buf()];

    var W = 0, H = 0, V = 0, R = 0, cx = 0, cy = 0, dpr = 1, secTop = 0, range = 1, aftTop = 0, aftBottom = 0;
    var C0, CT, CV, CF, EXIT_FOOT, EXIT_HEAD, K = 0.5523;   // K: cubic-bezier circle constant
    function pt(x, y) { return { x: x, y: y }; }
    function line(by, rb, p3) {                      // straight-sided vessel: bottom arc + two lines
      var p0 = pt(cx - rb, by);
      return { by: by, rb: rb, p0: p0, c1: pt(lerp(p0.x, p3.x, 1 / 3), lerp(p0.y, p3.y, 1 / 3)), c2: pt(lerp(p0.x, p3.x, 2 / 3), lerp(p0.y, p3.y, 2 / 3)), p3: p3 };
    }
    function measure() {
      // Same box as main.js's #heroCanvas (fixed, inset 0), so cx/cy land exactly on the orb.
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      V = Math.min(window.innerWidth, window.innerHeight) / 100;   // main.js D()
      R = V * 8;                                      // = the parked orb, D(16)
      cx = W / 2; cy = H / 2;
      var y = window.pageYOffset || 0;
      secTop = sec.getBoundingClientRect().top + y;
      range = Math.max(1, sec.offsetHeight - window.innerHeight);   // = main.js burstY maths
      var ar = after.getBoundingClientRect();
      aftTop = ar.top + y; aftBottom = ar.bottom + y;
      var narrow = W <= 760;
      // On phones the walls barely change shape in the dive, but the loud lines wait for them to
      // clear the width: a shorter dive, so the screen is not just walls for half a screen of scroll.
      DIVE_END = OPEN_END + (narrow ? 0.3 : 0.52) / RANGE_H;
      // Left side of the vessel: P0 (bottom arc's left end) → P3 (top), as a cubic; the right
      // side mirrors it about cx. by/rb = bottom arc centre y / radius (P0.y === by always).
      C0 = { by: cy, rb: R, p0: pt(cx - R, cy), c1: pt(cx - R, cy - K * R), c2: pt(cx - K * R, cy - R), p3: pt(cx - 0.01, cy - R) };
      CT = line(cy, R, pt(cx - 1.25 * R, -0.25 * H));                                    // shot up into a tube
      CV = line(0.93 * H, W * (narrow ? 0.22 : 0.13), pt(-0.06 * W, -0.12 * H));        // split open: a wide V
      CF = line(1.6 * H, W * (narrow ? 0.4 : 0.34), pt(-0.02 * W, -0.12 * H));          // dived in: walls at the edges
      // ex 0 → 0.5: the wall's foot (at y 1.6H) swings out until the wall stands upright with its
      // line — the cream hairline — on the screen edge; ex 0.5 → 1: it peels off (see peelY).
      var edge = OUTER[OUTER.length - 1].w * V + 1;  // the cream hairline's width: it shows, right on the edge
      EXIT_FOOT = [cx - CF.rb, edge];
      EXIT_HEAD = [CF.p3.x, edge];
      queueCloud();
    }
    function mixP(a, b, t) { return pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t)); }
    function mixC(a, b, t) {
      if (t <= 0) return a;
      if (t >= 1) return b;
      return { by: lerp(a.by, b.by, t), rb: lerp(a.rb, b.rb, t), p0: mixP(a.p0, b.p0, t), c1: mixP(a.c1, b.c1, t), c2: mixP(a.c2, b.c2, t), p3: mixP(a.p3, b.p3, t) };
    }
    // Near-linear: never slower than 0.7× its average speed, so chained beats never stop in between
    // (ease-in-out beats each braked to zero and the scroll felt like it paused between them).
    function lin(t) { return 0.7 * t + 0.3 * t * t * (3 - 2 * t); }
    function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }

    // Sample one side (side −1 = left, +1 = right) into B, with outward normals; oy = vertical shift.
    function sampleSide(c, side, B, oy) {
      var mx = side < 0 ? 0 : 2 * cx, sg = side < 0 ? 1 : -1;
      var x0 = mx + sg * c.p0.x, x1 = mx + sg * c.c1.x, x2 = mx + sg * c.c2.x, x3 = mx + sg * c.p3.x;
      var y0 = c.p0.y, y1 = c.c1.y, y2 = c.c2.y, y3 = c.p3.y;
      var len = 0, px = x0, py = y0, j, t, u;
      for (j = 1; j <= 16; j++) {
        t = j / 16; u = 1 - t;
        var qx = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
        var qy = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
        len += Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py)); px = qx; py = qy;
      }
      // Dense enough that the ripple's crests never fall between two samples (on phones too).
      var n = Math.max(48, Math.min(MAXN, Math.ceil(len / 4)));
      var al = 0;
      for (var i = 0; i <= n; i++) {
        t = i / n; u = 1 - t;
        var bx = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
        var by = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
        var dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
        var dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
        var dl = Math.sqrt(dx * dx + dy * dy) || 1, nx = dy / dl, ny = -dx / dl;
        if (nx * (bx - cx) + ny * (by - c.by) < 0) { nx = -nx; ny = -ny; }   // point away from the bowl
        if (i) al += Math.sqrt((bx - B.x[i - 1]) * (bx - B.x[i - 1]) + (by + oy - B.y[i - 1]) * (by + oy - B.y[i - 1]));
        B.x[i] = bx; B.y[i] = by + oy; B.nx[i] = nx; B.ny[i] = ny; B.a[i] = al;   // a: distance along the wall from its foot
      }
      if (peelY != null) peel(B, n, side);
      B.n = n; B.len = len;
    }
    // The exit: the walls bend away off the screen from the bottom up. Below peelY (the next
    // section's top edge, rising with the scroll) each point is pushed outward by the square of its
    // distance below it, so the wall curves away smoothly right above that edge. The ripple phase
    // (B.a) stays with the material; only the normals follow the bend.
    var peelY = null;
    function peel(B, n, side) {
      var reach = 0.3 * H, push = 0.25 * W, i, d;
      for (i = 0; i <= n; i++) {
        d = (B.y[i] - peelY) / reach;
        if (d > 0) B.x[i] += side * push * d * d;
      }
      for (i = 0; i <= n; i++) {
        var a = Math.max(0, i - 1), b = Math.min(n, i + 1);
        var tx = B.x[b] - B.x[a], ty = B.y[b] - B.y[a], tl = Math.sqrt(tx * tx + ty * ty) || 1;
        var nx = ty / tl, ny = -tx / tl;
        if (nx * B.nx[i] + ny * B.ny[i] < 0) { nx = -nx; ny = -ny; }   // keep pointing outward
        B.nx[i] = nx; B.ny[i] = ny;
      }
    }
    function exitShape(ex) {                         // smoothstep, no overshoot
      var a = smooth(0, 0.5, ex);
      var foot = lerp(EXIT_FOOT[0], EXIT_FOOT[1], a);
      var head = lerp(EXIT_HEAD[0], EXIT_HEAD[1], a);
      return line(CF.by, cx - foot, pt(head, CF.p3.y));
    }
    function bowl(c, oy) {
      ctx.beginPath();
      ctx.moveTo(c.p3.x, c.p3.y + oy);
      ctx.bezierCurveTo(c.c2.x, c.c2.y + oy, c.c1.x, c.c1.y + oy, c.p0.x, c.p0.y + oy);
      ctx.arc(cx, c.by + oy, Math.max(0.01, cx - c.p0.x), Math.PI, 0, true);   // under the bottom
      ctx.bezierCurveTo(2 * cx - c.c1.x, c.c1.y + oy, 2 * cx - c.c2.x, c.c2.y + oy, 2 * cx - c.p3.x, c.p3.y + oy);
      // Round lid, not a straight edge (a flat lid showed two corners mid-stretch): a curve that
      // carries on each side's own direction past its top end, so the tapering neck closes in a
      // smooth rounded tip.
      var dx = c.p3.x - c.c2.x, dy = c.p3.y - c.c2.y, dl = Math.sqrt(dx * dx + dy * dy);
      if (dl < 1e-3) { dx = 0; dy = -1; dl = 1; }
      var e = (cx - c.p3.x) * 1.2 / dl;
      ctx.bezierCurveTo(2 * cx - c.p3.x - dx * e, c.p3.y + oy + dy * e, c.p3.x + dx * e, c.p3.y + oy + dy * e, c.p3.x, c.p3.y + oy);
      ctx.closePath();
    }

    // ---- the questions: packed around the centre between the walls, loudest in the middle ----
    // The two loudest lines stack at the centre. Every other question, in list order, takes the
    // free spot closest to the centre in rings that grow tier by tier, searching from its own angle
    // so each tier spreads all round. The type is set as large as still fits them all; one that
    // fits nowhere even at the smallest size (phones) is left out. Then each gets its moment in the
    // scroll: the loud lines first. Once they are in, the rest ripple outward on their own clock
    // (seconds, not scroll), still never before the opening walls and the sinking liquid have
    // cleared its spot; scrolling back above the loud lines fades them out again.
    var qcx = 0, qcy = 0, cloudP = 0, cloudKey = '', cloudJob = 0;
    var STAGGER = 1.4, FADE_IN = 0.7, FADE_OUT = 0.35;   // seconds: last one starts / each fades in / out
    var trig = 1, restT = 0;                         // trig: cloud progress that sets the rest off; restT: their clock
    // Lay them out again only when the stage's size (or the fonts) changed, and a moment later:
    // a phone's sliding toolbar fires resizes, and every ScrollTrigger refresh calls measure() too.
    function queueCloud(force) {
      var key = qs.clientWidth + 'x' + qs.clientHeight;
      if (!force && key === cloudKey) return;
      cloudKey = key;
      clearTimeout(cloudJob);
      cloudJob = setTimeout(placeCloud, 50);
    }
    function wallAt(c, y) {                          // x of a straight-sided shape's left wall at height y
      return lerp(c.p0.x, c.p3.x, (c.p0.y - y) / (c.p0.y - c.p3.y));
    }
    function placeCloud() {
      if (!CF) return;                               // fonts can be ready before the canvas has a size (measure() bailed)
      var face = 5.1 * V;                            // the walls' rippling inner face (T0 + A in draw)
      var air = face + Math.max(12, 1.5 * V);
      var SH = qs.clientHeight || H;                 // the stage: frozen svh, so a phone's sliding toolbar does not reshuffle it
      var top = Math.max(0.04 * SH, (header ? header.offsetHeight : 0) + 12);
      var bot = SH - Math.max(24, 0.035 * SH);
      qcx = cx; qcy = lerp(top, bot, 0.48);
      function inner(y) { return wallAt(CF, y) + air; }   // left edge of the free area once dived in
      var ax = cx - inner(qcy), ay = (bot - top) / 2;
      qs.style.setProperty('--qs-w', Math.round(2 * ax) + 'px');
      var placed, loud = Q.filter(function (q) { return q.tier === 1; });
      function fits(x0, y0, x1, y1) {
        if (y0 < top || y1 > bot) return false;
        var lim = Math.max(inner(y0), inner(y1));
        return x0 >= lim && x1 <= W - lim;
      }
      function free(q, x0, y0, x1, y1) {
        for (var j = 0; j < placed.length; j++) {
          var o = placed[j], gx = q.gx + o.gx, gy = q.gy + o.gy;
          if (o !== q && x0 < o.x + o.w + gx && x1 > o.x - gx && y0 < o.y + o.h + gy && y1 > o.y - gy) return false;
        }
        return true;
      }
      // Rings: a squarish ellipse the shape of the free area (so they reach into the corners too);
      // rho = how far out a point is, 0 at the centre, 1 at the edge of the free area. Each quieter
      // tier starts its search at the average ring of the tier before it, so the sizes really
      // fall off from the centre outward instead of small ones filling holes next to the loud lines.
      var M = 2.4;
      function rho(x, y) { return Math.pow(Math.pow(Math.abs(x - qcx) / ax, M) + Math.pow(Math.abs(y - qcy) / ay, M), 1 / M); }
      function ring(r, th) {                         // the point at ring r, angle th
        var c = Math.cos(th), s = Math.sin(th);
        return [qcx + r * ax * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / M), qcy + r * ay * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / M)];
      }
      var count = {};
      Q.forEach(function (q) { count[q.tier] = (count[q.tier] || 0) + 1; });
      var START = { 2: -1.9, 3: -1.45, 4: -1.75 };   // first angle per tier (radians; 0 = right, −π/2 = up)
      // Type sizes at scale k: the 1440×900 look at k = 1, never below a readable minimum. The loud
      // lines stay narrow enough for "Nav mājaslapas?" to keep to one line.
      var BASE = [0, 84, 38, 25, 19], MIN = [0, 30, 17, 14, 12.5];
      function pack(k, test) {                       // lays the cloud out at scale k → how many were left out
        var i, q;
        for (i = 0; i < Q.length; i++) {
          q = Q[i];
          var fs = Math.max(MIN[q.tier], BASE[q.tier] * k);
          if (q.tier === 1) fs = Math.min(fs, 2 * ax / 9, 128);
          q.el.style.fontSize = fs.toFixed(1) + 'px';
          q.el.style.transform = 'none';
          q.fs = fs; q.gx = 0.5 * fs; q.gy = 0.36 * fs;   // half the gap it keeps around itself
          q.out = true; q.r = -1;
        }
        for (i = 0; i < Q.length; i++) { q = Q[i]; q.w = q.el.offsetWidth; q.h = q.el.offsetHeight; }   // one layout pass
        placed = [];
        var gh = 0;
        loud.forEach(function (q) { gh += q.h; });
        var sy = qcy - gh / 2;
        loud.forEach(function (q) { q.x = qcx - q.w / 2; q.y = sy; sy += q.h; q.out = false; placed.push(q); });
        var seen = {}, sum = {}, got = {}, left = 0;
        Q.forEach(function (q) {
          if (q.tier === 1 || (test && left)) return;   // a test run stops at the first one that does not fit
          var n0 = seen[q.tier] = (seen[q.tier] || 0) + 1;
          var pref = (START[q.tier] || 0) + (n0 - 1) * 2 * Math.PI / count[q.tier];
          var floor = got[q.tier - 1] ? sum[q.tier - 1] / got[q.tier - 1] : 0;
          // First within 60° of its own angle (so a tier spreads all round instead of stacking up
          // wherever the first gap was), then anywhere.
          for (var pass = 0; pass < 2 && q.out; pass++) {
            var dev = pass ? Math.PI : Math.PI / 3;
            for (var r = Math.max(0.05, floor); r <= 1.3 && q.out; r += 0.015) {
              var n = Math.max(24, Math.min(480, Math.ceil(2 * Math.PI * r * Math.max(ax, ay) / 9)));
              for (var a = 0; a < n; a++) {
                var d = Math.ceil(a / 2) * 2 * Math.PI / n;
                if (d > dev) break;
                var p2 = ring(r, pref + (a & 1 ? d : -d));
                var x0 = p2[0] - q.w / 2, y0 = p2[1] - q.h / 2;
                if (fits(x0, y0, x0 + q.w, y0 + q.h) && free(q, x0, y0, x0 + q.w, y0 + q.h)) {
                  q.x = x0; q.y = y0; q.out = false; placed.push(q); break;
                }
              }
            }
          }
          if (q.out) left++;
          else { sum[q.tier] = (sum[q.tier] || 0) + rho(q.x + q.w / 2, q.y + q.h / 2); got[q.tier] = (got[q.tier] || 0) + 1; }
        });
        return left;
      }
      // The largest scale at which every question fits, then a step back for some air. Where not
      // even the minimum sizes fit them all (phones), lower-priority ones are left out.
      // Small phones need the second tier closer to its readable minimum to fit the main needs.
      var minScale = W < 380 ? 0.45 : 0.55;
      var lo = minScale, hi = Math.max(1.35, Math.min(2.1, W / 1200, SH / 750)), best = lo;
      if (pack(hi, true) === 0) best = hi;
      else for (var it = 0; it < 6; it++) { var k = (lo + hi) / 2; if (pack(k, true) === 0) { best = lo = k; } else hi = k; }
      pack(Math.max(minScale, best * 0.98));
      // Its moment in the scroll, as cloud progress 0..1.
      function clearAt(q) {                          // first moment its spot is clear of the walls and the liquid
        for (var s = 0; s <= 1; s += 0.01) {
          var c = mixC(CV, CF, lin(seg(lerp(CLOUD_START, CLOUD_END, s), OPEN_END, DIVE_END)));
          var lim = Math.max(wallAt(c, q.y), wallAt(c, q.y + q.h)) + face + 6;
          if (q.x >= lim && q.x + q.w <= W - lim && q.y + q.h <= c.by - 0.22 * c.rb) return s;
        }
        return 1;
      }
      var loudAt = 0;
      loud.forEach(function (q) { loudAt = Math.max(loudAt, clearAt(q)); });
      loud.forEach(function (q, j) { q.d = 0.24; q.s = Math.min(loudAt + 0.07 * j, 1 - q.d); });
      // the rest set off as the last loud line settles in
      trig = loud.length ? loud[loud.length - 1].s + 0.75 * loud[loud.length - 1].d : 0;
      var rest = Q.filter(function (q) { return q.tier !== 1 && !q.out; });
      var dmin = Infinity, dmax = 0;
      rest.forEach(function (q) {
        q.dist = rho(q.x + q.w / 2, q.y + q.h / 2);
        dmin = Math.min(dmin, q.dist); dmax = Math.max(dmax, q.dist);
      });
      rest.forEach(function (q, j) {
        // mostly list order (the louder first), partly distance (a ripple outward)
        var u = 0.6 * (rest.length > 1 ? j / (rest.length - 1) : 0) + 0.4 * (dmax > dmin ? (q.dist - dmin) / (dmax - dmin) : 0);
        q.at = u * STAGGER;                          // seconds after the trigger
        q.c = clearAt(q);                            // cloud progress where its spot is clear
      });
      Q.forEach(function (q) { q.el.classList.toggle('is-out', q.out); });
      showCloud(cloudP, 0);                          // re-apply at once: no frame with everything at rest
    }
    function showCloud(cp, dt) {
      cloudP = cp;
      var go = cp >= trig;
      restT = go ? restT + dt : 0;                   // back above the trigger → the sequence starts over
      for (var i = 0; i < Q.length; i++) {
        var q = Q[i];
        if (q.out) continue;
        var r;
        if (q.tier === 1) r = clamp01((cp - q.s) / q.d);
        else {
          var on = go && restT >= q.at && cp >= q.c;
          r = q.tp = on ? Math.min(1, q.tp + dt / FADE_IN) : Math.max(0, q.tp - dt / FADE_OUT);
        }
        if (r === q.r) continue;                     // unchanged since the last frame
        q.r = r;
        var e = outCubic(r);
        if (q.tier === 1) {                          // rises out of its mask, in place
          q.el.style.opacity = 1;
          q.el.style.transform = 'translate3d(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px,0)';
          q.t.style.transform = 'translate3d(0,' + ((1 - e) * 130).toFixed(2) + '%,0)';
          continue;
        }
        // comes out of the centre: starts a quarter of the way back towards it, a little smaller
        var k = 0.25 * (1 - e);
        var tx = q.x - (q.x + q.w / 2 - qcx) * k, ty = q.y - (q.y + q.h / 2 - qcy) * k;
        q.el.style.opacity = (r * r * (3 - 2 * r)).toFixed(3);
        q.el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + (0.88 + 0.12 * e).toFixed(4) + ')';
      }
    }

    var tau = 0, live = false;
    var shown = false;
    function setState(vis, on) {
      if (vis !== shown) { shown = vis; cv.style.visibility = vis ? 'visible' : 'hidden'; if (!vis) ctx.clearRect(0, 0, cv.width, cv.height); }
      if (on !== live) { live = on; html.classList.toggle('burst-live', on); }   // hides the orb (the spent drop)
    }
    var lastNow = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;   // capped: a background tab must not jump the clock
      lastNow = now;
      if (!W) { measure(); if (!W) return; }
      if (!ctx) { showCloud(1, dt); return; }        // no canvas → no rift, just the questions

      // ---- scroll state, read before any writes this frame ----
      var y = window.pageYOffset || 0;
      var p = clamp01((y - secTop) / range);
      var shift = Math.max(0, secTop - y);            // stage not pinned yet → it sits this far down
      // As the next section comes up the walls straighten and settle flush with the screen edges (the
      // cream line on the edge) for the whole section; they leave as it ends, peeling away from the
      // bottom up just above the next section's top edge — 1:1 with the scroll, until the bend
      // has carried their top ends off the screen too.
      var peel = clamp01((y - (aftBottom - H)) / (1.45 * H));
      var ex = 0.5 * clamp01((y - (aftTop - 0.95 * H)) / (0.75 * H)) + 0.5 * peel;
      peelY = peel > 0 ? aftBottom - y : null;
      // ---- opening, dive and questions: a pure function of the scroll position (Lenis already
      // smooths the scroll). No easing of its own: an eased copy lags, so scrolling back up the
      // rift lingered after the strike point and hid the white dot — not the mirror of going down.
      tau = seg(p, AT, OPEN_END);
      var dive = seg(p, OPEN_END, DIVE_END);
      showCloud(seg(p, CLOUD_START, CLOUD_END), dt);

      // Before the stage pins, the orange dot rides up from below at the stage's centre (shift)
      // into the white dot we have been following (the orb, main.js) — the strike at the pin.
      var vis = (tau > 0 || shift < H * 0.5 + R + 2) && ex < 1;
      setState(vis, vis && tau > 0);
      if (!vis) return;
      draw(now / 1000, tau, dive, ex, shift);
    }

    function draw(t, tau, dive, ex, oy) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // One even pace: every beat runs near-linearly and starts before the last one ends, so
      // something always moves at about the same speed — no beat bursts (the tube used to fill
      // the screen within ~20px of scroll) and none brakes to a standstill.
      var vf = smooth(0, 0.05, tau);                  // the drop strikes: dot → vessel, under the splash
      var shoot = lin(seg(tau, 0.02, 0.32));
      var beamUp = lin(seg(tau, 0.27, 0.47)), widen = lin(seg(tau, 0.42, 0.64));
      var split = lin(seg(tau, 0.6, 0.86)), spread = lin(seg(tau, 0.6, 1));
      var c = mixC(mixC(mixC(C0, CT, shoot), CV, spread), CF, lin(dive));
      if (ex > 0) c = exitShape(ex);
      var ccy = cy + oy;
      // brim-full while it is still the dot; the splash knocks it down to half
      var level = lerp(cy - 0.92 * R, c.by - 0.1 * c.rb, smooth(0, 0.1, tau)) + oy;
      var rb = c.rb;

      // the tube's inside while it shoots up: glassy — a touch lighter at the sides than the middle
      var tintA = shoot * (1 - split);
      if (tintA > 0) {
        var tw = Math.max(1, cx - c.p0.x) * 1.15, tg = ctx.createLinearGradient(cx - tw, 0, cx + tw, 0);
        tg.addColorStop(0, 'rgba(' + CREAM_RGB + ',0.10)'); tg.addColorStop(0.22, WASH); tg.addColorStop(0.78, WASH); tg.addColorStop(1, 'rgba(' + CREAM_RGB + ',0.10)');
        bowl(c, oy); ctx.globalAlpha = tintA; ctx.fillStyle = tg; ctx.fill(); ctx.globalAlpha = 1;
      }

      // walls: the beam → V → split halves (inside), plus the outer layers once it has split
      var beamTop = lerp(level, -0.05 * H, beamUp);
      var T0 = 3.4 * V, A = 1.7 * V;
      for (var sd = 0; sd < 2; sd++) {
        var side = sd ? 1 : -1, B = SIDES[sd];
        sampleSide(c, side, B, oy);
        // Ripple phase from the distance along the wall, not from a whole number of waves per wall:
        // that count was rounded, so every time the growing wall gained a wave all the teeth jumped.
        var n = B.n, kw = Math.PI * 2 / (13 * V);
        // a point + outward normal halfway up the visible wall: the walls' shading runs across it
        var im = Math.round(n * 0.6), mx = B.x[im], my = B.y[im], mnx = B.nx[im], mny = B.ny[im];
        if (split > 0) {
          for (var bj = 0; bj < OUTER.length; bj++) {
            var O = OUTER[bj], ow = OUTER_AT[bj];
            ctx.beginPath();
            for (var i = 0; i <= n; i++) ctx.lineTo(B.x[i], B.y[i]);
            for (i = n; i >= 0; i--) {
              var s = i / n, o = (ow + (O.wave ? O.wave * Math.sin(s * Math.PI * 5.2 + 0.8 + t * 0.9 * side) : 0)) * split * smooth(0.05, 0.3, s) * V;
              ctx.lineTo(B.x[i] + B.nx[i] * o, B.y[i] + B.ny[i] * o);
            }
            ctx.closePath();
            if (O.role === 'wash') {                     // a soft shadow fading away, not a flat grey blob
              var wo = (ow + O.wave) * split * V, wg = ctx.createLinearGradient(mx, my, mx + mnx * wo, my + mny * wo);
              wg.addColorStop(0, 'rgba(' + WASH_RGB + ',1)'); wg.addColorStop(0.3, 'rgba(' + WASH_RGB + ',0.85)'); wg.addColorStop(1, 'rgba(' + WASH_RGB + ',0)');
              ctx.fillStyle = wg;
            } else if (O.role === 'deep') {              // deep orange darkening outward
              var dO = OUTER_AT[bj] * split * V, dg = ctx.createLinearGradient(mx, my, mx + mnx * dO, my + mny * dO);
              dg.addColorStop(0, DEEP); dg.addColorStop(1, DEEP_DK);
              ctx.fillStyle = dg;
            } else ctx.fillStyle = O.fill;
            ctx.fill();
          }
        }
        if (beamUp > 0) {
          // height reached by the beam, as a sample index (it starts at the bowl's equator)
          var iMax = n;
          if (beamUp < 1) { iMax = 0; while (iMax < n && B.y[iMax + 1] >= beamTop) iMax++; }
          ctx.beginPath();
          for (i = 0; i <= iMax; i++) {                // outer edge: thin line → V → the wall
            var hw = Math.max(1, Math.abs(B.x[i] - cx));
            var fo = lerp(Math.max(Math.min(1, 1.2 / hw), widen * Math.pow(i / n, 0.7)), 1, split);
            ctx.lineTo(cx + (B.x[i] - cx) * fo, B.y[i]);
          }
          // inner edge: the gap opening → rippling wall face. One clean, long wave with a faint
          // second one riding on it, so it moves like liquid without looking torn.
          var IX = SIDES[sd].ix || (SIDES[sd].ix = new Float32Array(MAXN + 1));
          for (i = iMax; i >= 0; i--) {
            var hw2 = Math.max(1, Math.abs(B.x[i] - cx)), s2 = i / n, ph = kw * B.a[i];
            var rip = 0.88 * Math.sin(ph - t * 2.4 + side * 1.3) + 0.12 * Math.sin(ph * 1.6 + t * 1.3 + side * 2.1);
            var th = (T0 + A * rip * split) * smooth(0.06, 0.3, s2);
            var fi = split * clamp01(1 - th / hw2);
            IX[i] = cx + (B.x[i] - cx) * fi;
            ctx.lineTo(IX[i], B.y[i]);
          }
          ctx.closePath();
          // lit from the gap: brighter on the inner face, deeper toward the outer edge
          var gw = (T0 + A) * 1.1, fg = ctx.createLinearGradient(mx, my, mx - mnx * gw, my - mny * gw);
          fg.addColorStop(0, mixHex(ACC, ACC_DKR, split)); fg.addColorStop(0.55, ACC); fg.addColorStop(1, mixHex(ACC, ACC_HI, split));
          ctx.fillStyle = fg; ctx.fill();
          if (split > 0) {                             // a fine light line along the rippling face
            ctx.beginPath();
            for (i = iMax; i >= 0; i--) ctx.lineTo(IX[i], B.y[i]);
            ctx.globalAlpha = 0.45 * split; ctx.strokeStyle = ACC_LINE; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
          }
        }
      }
      // the beam's bright core, shooting up — with a soft glow and a bright tip while it rises
      if (beamUp > 0 && widen < 1) {
        var ba = 0.95 * (1 - widen);
        ctx.save();
        ctx.globalAlpha = ba; ctx.strokeStyle = CREAM; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(' + SOFT_RGB + ',0.9)'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(cx, level); ctx.lineTo(cx, beamTop); ctx.stroke();
        ctx.restore();
        if (beamUp < 1) {
          var tr = 3.2 * V, tgl = ctx.createRadialGradient(cx, beamTop, 0, cx, beamTop, tr);
          tgl.addColorStop(0, 'rgba(' + TIP + ',0.95)'); tgl.addColorStop(0.25, 'rgba(' + SOFT_RGB + ',0.45)'); tgl.addColorStop(1, 'rgba(' + ACC_RGB + ',0)');
          ctx.globalAlpha = ba * smooth(0, 0.08, beamUp) * (1 - smooth(0.8, 1, beamUp)); ctx.fillStyle = tgl;
          ctx.beginPath(); ctx.arc(cx, beamTop, tr, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        }
      }

      // liquid, clipped to the vessel; each layer shaded from its surface down
      if (vf > 0 && level - rb * 0.3 < H) {
        var splash = tau > 0 ? Math.min(2.2, 1 + 2.4 * Math.exp(-tau * 14)) : 1;
        ctx.save(); bowl(c, oy); ctx.clip();
        ctx.globalAlpha = vf;
        var x0 = c.p0.x - rb * 0.3, x1 = 2 * cx - x0, step = Math.max(4, rb / 14), bot = c.by + oy + rb * 1.2;
        for (var k = 0; k < LIQ.length; k++) {
          var L = LIQ[k], y0 = level + L.d * rb;
          ctx.beginPath();
          for (var x = x0; x <= x1 + step; x += step) ctx.lineTo(x, y0 + Math.sin((x - cx) / rb * 2.4 * L.k + t * L.v * 2 + L.ph) * L.a * rb * splash);
          ctx.lineTo(x1 + step, bot); ctx.lineTo(x0, bot); ctx.closePath();
          if (L.dark) {
            var lg = ctx.createLinearGradient(0, y0 - L.a * rb, 0, Math.min(bot, y0 + rb));
            lg.addColorStop(0, L.fill); lg.addColorStop(1, L.dark);
            ctx.fillStyle = lg;
          } else ctx.fillStyle = L.fill;
          ctx.fill();
        }
        ctx.restore();
      }
      // vessel outline: a glass edge, brightest at the bottom and fading up the tube
      var olA = 0.55 * vf * (1 - split);
      if (olA > 0) {
        var og = ctx.createLinearGradient(0, c.by + oy + c.rb, 0, Math.min(c.p3.y + oy, c.by + oy - c.rb));
        og.addColorStop(0, 'rgba(' + CREAM_RGB + ',1)'); og.addColorStop(1, 'rgba(' + CREAM_RGB + ',0.25)');
        bowl(c, oy); ctx.globalAlpha = olA; ctx.strokeStyle = og; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
      }

      // the orb's stand-in dot (same shading as .fx-orb::after: circle at 38% 34%, farthest-corner)
      if (vf < 1) {
        var g = ctx.createRadialGradient(cx - 0.24 * R, ccy - 0.32 * R, 0, cx - 0.24 * R, ccy - 0.32 * R, 1.811 * R);
        // ×0.96: over the dark bg the orb's blend pair renders its gradient ~4% darker than flat
        g.addColorStop(0, ORB0); g.addColorStop(0.46, ORB1); g.addColorStop(1, ORB2);
        ctx.globalAlpha = 1 - vf; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, ccy, R, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      // the splash where the white drop (the orb, main.js) struck: two rings and a crown of drops
      for (var rg = 0; rg < 2; rg++) {
        var rp = seg(tau, rg * 0.035, 0.16 + rg * 0.05);
        if (rp <= 0 || rp >= 1) continue;
        var rx = R * (0.25 + (0.95 - rg * 0.3) * outCubic(rp));
        ctx.globalAlpha = (0.75 - rg * 0.3) * (1 - rp); ctx.strokeStyle = CREAM; ctx.lineWidth = 1.5 - rg * 0.5;
        ctx.beginPath(); ctx.ellipse(cx, level, rx, rx * 0.28, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      var dp = seg(tau, 0, 0.2);
      if (dp > 0 && dp < 1) {
        for (var j = 0; j < 9; j++) {
          var hx = hash(j), hy = hash(j + 31), hs = hash(j + 57);
          var u = clamp01(dp * (1 + 0.35 * hy) - 0.05 * hs);   // each drop on its own clock
          if (u <= 0 || u >= 1) continue;
          var dx = cx + (j / 8 * 2 - 1 + (hx - 0.5) * 0.2) * R * 1.15 * outCubic(u);
          var dy = level - R * (0.55 + 0.75 * hy) * 4 * u * (1 - u);   // up and back down into the liquid
          var dr = V * (0.2 + 0.3 * hs) * (1 - 0.5 * u);
          ctx.globalAlpha = 1 - smooth(0.65, 1, u);
          ctx.fillStyle = hs > 0.7 ? CREAM : SOFT;
          ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); queueCloud(true); });   // the questions' sizes follow the fonts
    if (ScrollTrigger.addEventListener) ScrollTrigger.addEventListener('refresh', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    requestAnimationFrame(frame);
  }

  setupBurst();
})();
