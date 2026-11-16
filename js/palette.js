// copy/: the page wears one palette, "Dziļais melnais" — the site's own character with the ground a
// step deeper (OKLCH L 0.146 → 0.12), so the accent and the text stand out more. Built in OKLCH and
// solved for WCAG 2.2 + APCA (ink ≥ 8.5:1, ink-dim ≥ 6.5:1, ink-faint ≥ 4.6:1, accent ≥ 4.6:1):
// ground [0.12, 0.004, 286] · ink [0.965, 0.01, 82] · accent [0.67, 0.225, 32].
// Loaded in <head> (not deferred), so the colours are on before the first paint.
// window.rastPalette.colors() hands the tokens to the canvases (main.js, studio-burst.js).
(function () {
  'use strict';

  var C = { bg: "#060607", bg2: "#08080A", surface: "#0C0C0E", surface2: "#111113", ink: "#F7F3EC", inkDim: "#B2B1BD",
    inkFaint: "#9594A2", accent: "#FF4D30", accentSoft: "#FF866F", accentDeep: "#CA2200" };
  var TOKENS = { bg: '--bg', bg2: '--bg-2', surface: '--surface', surface2: '--surface-2', ink: '--ink',
    inkDim: '--ink-dim', inkFaint: '--ink-faint', accent: '--accent', accentSoft: '--accent-soft', accentDeep: '--accent-deep' };
  var root = document.documentElement;

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', '); }

  Object.keys(TOKENS).forEach(function (k) { root.style.setProperty(TOKENS[k], C[k]); });
  root.style.setProperty('--bg-rgb', rgb(C.bg));
  root.style.setProperty('--ink-rgb', rgb(C.ink));
  root.style.setProperty('--accent-rgb', rgb(C.accent));
  root.setAttribute('data-palette', 'dzilais-melnais');   // copy/css/palette.css hooks the sphere colours on this
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', C.bg);

  // Colours as '#RRGGBB' strings; .intro = the first screen's colours (the same, the page is dark throughout).
  function colors() {
    var out = { tone: 'dark', glow: '#FFFFFF' };
    Object.keys(C).forEach(function (k) { out[k] = C[k]; });
    out.intro = out;
    return out;
  }
  window.rastPalette = { colors: colors };
})();
