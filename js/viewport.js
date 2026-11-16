/* Keep animation and sticky layout geometry steady while mobile browser bars move. */
(function () {
  'use strict';
  var root = document.documentElement;
  var mobile = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
  var width = window.innerWidth, height = window.innerHeight;
  var rotationTimer;

  function update(force) {
    var nextWidth = window.innerWidth, nextHeight = window.innerHeight;
    // Chrome/Safari toolbars, in-app browser controls and keyboards only change height.
    if (!force && mobile.matches && nextWidth === width) return;
    if (!force && nextWidth === width && nextHeight === height) return;
    width = nextWidth; height = nextHeight;
    root.style.setProperty('--svh1', (height / 100) + 'px');
    window.dispatchEvent(new Event('rast:viewport'));
  }
  root.style.setProperty('--svh1', (height / 100) + 'px');
  window.rastViewport = { height: function () { return height; } };
  window.addEventListener('resize', function () { update(false); }, { passive: true });
  function rotate() {
    clearTimeout(rotationTimer);
    // Some WebViews report the new width before the rotated height has settled.
    rotationTimer = setTimeout(function () { update(true); }, 250);
  }
  window.addEventListener('orientationchange', rotate, { passive: true });
  if (window.screen.orientation && window.screen.orientation.addEventListener) {
    window.screen.orientation.addEventListener('change', rotate);
  }
})();
