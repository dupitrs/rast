/* One-time solid block reveals for the headings below “Kā mēs strādājam”.
   The original headings remain the semantic content and the no-motion fallback. */
(function () {
  'use strict';
  var section = document.getElementById('principles');
  if (!section || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
    var blocks = [];
    section.querySelectorAll('.tenet__visual').forEach(function (stage) {
      var title = stage.querySelector('.tenet__title');
      if (!title) return;
      var brick = document.createElement('div');
      brick.className = 'tenet__brick';
      ['front', 'top', 'bottom', 'left', 'right'].forEach(function (side) {
        var face = document.createElement('span');
        face.className = 'tenet__face tenet__face--' + side;
        face.setAttribute('aria-hidden', 'true');
        brick.appendChild(face);
      });
      stage.appendChild(brick);
      brick.appendChild(title);
      stage.classList.add('is-flip');
      gsap.fromTo(brick, { rotationX: 0 }, {
        rotationX: -180,
        duration: 1.1,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: stage,
          start: 'top 84%',
          toggleActions: 'play none none none',
          once: true
        }
      });
      blocks.push({ stage: stage, brick: brick, title: title });
    });

    return function () {
      blocks.forEach(function (block) {
        block.stage.classList.remove('is-flip');
        block.stage.appendChild(block.title);
        block.brick.remove();
      });
    };
  });
})();
