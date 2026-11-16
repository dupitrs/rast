/* Decorative films only load in view; posters remain for reduced motion and no JS. */
(function () {
  'use strict';
  var section = document.getElementById('principles');
  if (!section || !('IntersectionObserver' in window)) return;
  var videos = Array.from(section.querySelectorAll('.tenet__video'));
  var button = section.querySelector('.tenets__motion');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var enabled = !motion.matches;
  var visible = new Set();
  var unavailable = new Set();

  function update() {
    button.textContent = enabled ? 'Apturēt video' : 'Atskaņot video';
    videos.forEach(function (video) {
      if (enabled && visible.has(video) && !unavailable.has(video) && !document.hidden) {
        if (!video.getAttribute('src')) {
          video.src = video.canPlayType('video/webm; codecs="vp9"')
            ? video.dataset.src.replace(/\.mp4$/, '.webm') : video.dataset.src;
        }
        video.muted = true;
        var playing = video.play();
        if (playing) playing.catch(function () { /* Keep the poster if playback is unavailable. */ });
      } else {
        video.pause();
      }
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    update();
  }, { threshold: 0.05 });
  videos.forEach(function (video) {
    video.addEventListener('error', function () {
      // A browser may advertise a codec that its hardware cannot actually decode.
      if (/\.webm$/.test(video.getAttribute('src') || '')) {
        video.src = video.dataset.src;
        update();
      } else {
        unavailable.add(video);
        video.removeAttribute('src');
        video.load(); // Restore the poster instead of leaving a broken video frame.
      }
    });
    observer.observe(video);
  });
  button.hidden = false;
  button.addEventListener('click', function () { enabled = !enabled; update(); });
  motion.addEventListener('change', function () { enabled = !motion.matches; update(); });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', function () { videos.forEach(function (video) { video.pause(); }); });
  window.addEventListener('pageshow', update);
  update();
})();
