// copy/: no brand at the very top of the page; anywhere
// further down (scrolling either way) the header carries the "r." mark.
(function () {
  var header = document.getElementById('header');
  if (!header) return;
  function onScroll() {
    header.classList.toggle('header--mark', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
