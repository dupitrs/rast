/* ============================================================
   rast — tab title switch
   When the visitor leaves the tab, the title changes; when they
   come back, the page's own title returns.
   Standalone: no dependencies, safe on every page.
   ============================================================ */
(function () {
  'use strict';

  // Shown while the tab is in the background — picked by page language (<html lang>).
  var AWAY_TITLES = { lv: 'Kur tu pazudi?', en: 'Where did you go?', ru: 'Ты куда?' };
  var lang = (document.documentElement.lang || 'lv').slice(0, 2).toLowerCase();
  var AWAY_TITLE = AWAY_TITLES[lang] || AWAY_TITLES.lv;

  if (typeof document.hidden === 'undefined') return;   // very old browser: do nothing

  var realTitle = document.title;   // the page's own title

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // Remember the current title first - it may have been changed by other code
      // since load. Never remember our own away title.
      if (document.title !== AWAY_TITLE) realTitle = document.title;
      document.title = AWAY_TITLE;
    } else {
      document.title = realTitle;
    }
  });

  // Back/forward cache can restore the page with our away title still in place.
  window.addEventListener('pageshow', function () {
    if (!document.hidden) document.title = realTitle;
  });
})();
