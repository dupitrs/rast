/* Independent looping illustrations in the normal page flow. */
(function () {
  'use strict';
  var section = document.getElementById('principles');
  if (!section || !window.gsap) return;

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
    section.querySelectorAll('.tenet').forEach(function (panel, index) {
      var find = function (selector) { return panel.querySelectorAll(selector); };
      var tl = gsap.timeline({
        paused: true,
        repeat: -1,
        repeatDelay: 0.12,
        defaults: { ease: 'power2.inOut' }
      });
      tl.to({}, { duration: 1 });

      // Sample the SVG route once, without an extra motion-path dependency.
      function travel(dot, path, originX, originY, start, duration) {
        var length = path.getTotalLength();
        var point = path.getPointAtLength(0);
        var steps = 40;
        tl.fromTo(dot, { x: point.x - originX, y: point.y - originY, opacity: 0 }, {
          x: point.x - originX, y: point.y - originY,
          opacity: 1, duration: 0.015, immediateRender: false
        }, start);
        for (var step = 1; step <= steps; step++) {
          point = path.getPointAtLength(length * step / steps);
          tl.to(dot, {
            x: point.x - originX, y: point.y - originY,
            duration: duration / steps, ease: 'none'
          }, start + 0.015 + (step - 1) * duration / steps);
        }
      }

      if (index === 0) {
        // One clear action in the design is processed by the backend and confirmed.
        var request = find('.principle-together-request');
        var response = find('.principle-together-response');
        var pointer = find('.principle-together-pointer');
        var click = find('.principle-together-click');
        var button = find('.principle-together-button');
        var idle = find('.principle-together-button-idle');
        var done = find('.principle-together-done');
        var togetherAccent = getComputedStyle(panel).getPropertyValue('--accent').trim();
        var togetherInk = getComputedStyle(panel).getPropertyValue('--ink').trim();
        gsap.set(click, { svgOrigin: '410 364' });
        tl.set([request, response, click, done], { opacity: 0 }, 0)
          .set(pointer, { x: 470, y: 470, opacity: 0 }, 0)
          .set(button, { fillOpacity: 0.1 }, 0)
          .set(idle, { opacity: 1 }, 0)
          .to(pointer, { x: 414, y: 371, opacity: 1, duration: 0.22 }, 0.04)
          .fromTo(click, { scale: 0.3, opacity: 0.8 }, { scale: 1, opacity: 0, duration: 0.18, immediateRender: false }, 0.27)
          .to(pointer, { opacity: 0, duration: 0.12 }, 0.36);
        travel(request, panel.querySelector('.principle-together-request-path'), 0, 0, 0.3, 0.25);
        tl.to(request, { opacity: 0, duration: 0.025 }, 0.565);
        find('.principle-together-server').forEach(function (server, i) {
          var start = 0.56 + i * 0.1;
          tl.to(server.querySelector('rect'), { stroke: togetherAccent, strokeOpacity: 0.9, duration: 0.07 }, start)
            .to(server.querySelector('circle'), { fillOpacity: 1, duration: 0.07 }, start)
            .to(server.querySelector('rect'), { stroke: togetherInk, strokeOpacity: 0.5, duration: 0.14 }, start + 0.16)
            .to(server.querySelector('circle'), { fillOpacity: 0, duration: 0.14 }, start + 0.16);
        });
        travel(response, panel.querySelector('.principle-together-response-path'), 0, 0, 0.88, 0.32);
        tl.to(response, { opacity: 0, duration: 0.025 }, 1.215)
          .to(idle, { opacity: 0, duration: 0.06 }, 1.21)
          .to(button, { fillOpacity: 1, duration: 0.1 }, 1.21)
          .to(done, { opacity: 1, duration: 0.1 }, 1.24)
          .to(done, { opacity: 0, duration: 0.12 }, 1.79)
          .to(button, { fillOpacity: 0.1, duration: 0.12 }, 1.79)
          .to(idle, { opacity: 1, duration: 0.12 }, 1.84)
          .to({}, { duration: 0.08 }, 1.96);
      } else if (index === 1) {
        // Select one element at a time; the chosen element travels into the same composition.
        var choicePhases = find('.principle-choice-phase');
        var choiceOptions = find('.principle-choice-option');
        var choiceResults = find('.principle-choice-result');
        var choiceTransfers = find('.principle-choice-transfer');
        var choiceSelection = find('.principle-choice-selection');
        var choiceComplete = find('.principle-choice-complete');
        tl.set([choicePhases, choiceOptions, choiceResults, choiceTransfers, choiceSelection, choiceComplete], { opacity: 0 }, 0);
        // The groups' native origin is the centre of the selection block.
        gsap.set(choiceTransfers, { svgOrigin: '240 350' });
        function choose(kind, start, destinationY, scale) {
          var phase = find('.principle-choice-phase--' + kind);
          var first = find('.principle-choice-' + kind + '--a');
          var second = find('.principle-choice-' + kind + '--b');
          var selected = find('.principle-choice-' + kind + '--c');
          var transfer = find('.principle-choice-transfer--' + kind);
          var result = find('.principle-choice-result--' + kind);
          tl.set(phase, { opacity: 1 }, start)
            .fromTo(first, { opacity: 0 }, { opacity: 1, duration: 0.045, immediateRender: false }, start)
            .to(first, { opacity: 0, duration: 0.045 }, start + 0.13)
            .fromTo(second, { opacity: 0 }, { opacity: 1, duration: 0.045, immediateRender: false }, start + 0.17)
            .to(second, { opacity: 0, duration: 0.045 }, start + 0.30)
            .fromTo(selected, { opacity: 0 }, { opacity: 1, duration: 0.055, immediateRender: false }, start + 0.34)
            .to(choiceSelection, { opacity: 0.95, duration: 0.06 }, start + 0.40)
            .fromTo(transfer, { x: 0, y: 0, scale: 1, opacity: 0 }, {
              x: 0, y: 0, scale: 1, opacity: 1, duration: 0.015, immediateRender: false
            }, start + 0.54)
            .to(selected, { opacity: 0.15, duration: 0.06 }, start + 0.54)
            .to(transfer, { x: 425, y: destinationY - 350, scale: scale, duration: 0.22 }, start + 0.555)
            .set(result, { opacity: 1 }, start + 0.775)
            .set(transfer, { opacity: 0 }, start + 0.775)
            .to(choiceSelection, { opacity: 0, duration: 0.08 }, start + 0.70)
            .to(phase, { opacity: 0, duration: 0.06 }, start + 0.77);
        }
        choose('font', 0.03, 225, 0.6);
        choose('palette', 0.88, 296, 0.65);
        choose('image', 1.73, 418, 1.1);
        tl.to(choiceComplete, { opacity: 0.75, duration: 0.12 }, 2.51)
          .to(choiceComplete, { opacity: 0, duration: 0.18 }, 2.74)
          .to(choiceResults, { opacity: 0, duration: 0.18 }, 2.98)
          .to({}, { duration: 0.06 }, 3.16);
      } else if (index === 2) {
        // Scattered, equally weighted pieces settle into a readable hierarchy.
        var clarityComposition = find('.principle-clarity-composition');
        var clarityAlignment = find('.principle-clarity-alignment');
        var clarityParts = [
          ['.principle-clarity-nav--a', { x: 65, y: 82, rotation: 8, opacity: 0.55 }, '237 175', 0.12],
          ['.principle-clarity-nav--b', { x: -70, y: -35, rotation: -5, opacity: 0.55 }, '363 175', 0.15],
          ['.principle-clarity-nav--c', { x: 125, y: 162, rotation: -9, opacity: 0.55 }, '489 175', 0.18],
          ['.principle-clarity-heading', { x: 74, y: 56, rotation: -5, scale: 0.64, opacity: 0.48 }, '200 294', 0.36],
          ['.principle-clarity-copy--a', { x: -25, y: -40, rotation: 4, opacity: 0.55 }, '200 350', 0.57],
          ['.principle-clarity-copy--b', { x: 58, y: 35, rotation: -6, opacity: 0.55 }, '200 376', 0.61],
          ['.principle-clarity-copy--c', { x: -70, y: 84, rotation: 5, opacity: 0.55 }, '200 402', 0.65],
          ['.principle-clarity-contact', { x: 232, y: -160, rotation: 7, opacity: 0.48 }, '316 505', 0.83]
        ];
        clarityParts.forEach(function (part) {
          var elements = find(part[0]);
          gsap.set(elements, { svgOrigin: part[2] });
          tl.set(elements, part[1], 0)
            .to(elements, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.25 }, part[3])
            .set(elements, part[1], 1.84);
        });
        tl.set(clarityComposition, { opacity: 1 }, 0)
          .set(find('.principle-clarity-selected'), { opacity: 0 }, 0)
          .set(find('.principle-clarity-button'), { fillOpacity: 0, strokeOpacity: 0.5 }, 0)
          .set(find('.principle-clarity-arrow'), { opacity: 0.35 }, 0)
          .fromTo(clarityAlignment, { y: 0, opacity: 0 }, { y: 0, opacity: 0.5, duration: 0.05, immediateRender: false }, 0.06)
          .to(clarityAlignment, { y: 440, duration: 1, ease: 'none' }, 0.11)
          .to(find('.principle-clarity-selected'), { opacity: 1, duration: 0.12 }, 0.31)
          .to(find('.principle-clarity-button'), { fillOpacity: 0.12, strokeOpacity: 0.95, duration: 0.18 }, 0.94)
          .to(find('.principle-clarity-arrow'), { opacity: 1, duration: 0.18 }, 0.94)
          .to(clarityAlignment, { opacity: 0, duration: 0.08 }, 1.11)
          .to(clarityComposition, { opacity: 0, duration: 0.12 }, 1.7)
          .set(find('.principle-clarity-selected'), { opacity: 0 }, 1.84)
          .set(find('.principle-clarity-button'), { fillOpacity: 0, strokeOpacity: 0.5 }, 1.84)
          .set(find('.principle-clarity-arrow'), { opacity: 0.35 }, 1.84)
          .to(clarityComposition, { opacity: 1, duration: 0.16 }, 1.86)
          .to({}, { duration: 0.1 }, 2.02);
      } else {
        // The same two people exchange ideas and respond throughout the project.
        var send = find('.principle-dialogue-send');
        var reply = find('.principle-dialogue-reply');
        var sendPath = panel.querySelector('.principle-dialogue-path--send');
        var replyPath = panel.querySelector('.principle-dialogue-path--reply');
        tl.set([send, reply], { opacity: 0 }, 0);
        gsap.set(find('.principle-dialogue-pulse--left'), { svgOrigin: '205 350', opacity: 0 });
        gsap.set(find('.principle-dialogue-pulse--right'), { svgOrigin: '695 350', opacity: 0 });
        function receive(side, time) {
          tl.fromTo(find('.principle-dialogue-pulse--' + side), {
            scale: 0.43, opacity: 0.8
          }, { scale: 1, opacity: 0.25, duration: 0.15, immediateRender: false }, time);
        }
        [0.04, 0.5].forEach(function (start) {
          travel(send, sendPath, 450, 147.5, start, 0.17);
          tl.to(send, { opacity: 0, duration: 0.025 }, start + 0.185);
          receive('right', start + 0.185);
          travel(reply, replyPath, 450, 552.5, start + 0.225, 0.17);
          tl.to(reply, { opacity: 0, duration: 0.025 }, start + 0.41);
          receive('left', start + 0.41);
        });
        tl.to(find('.principle-dialogue-pulse'), { opacity: 0, duration: 0.12 }, 1.06);
        // Agreed information from both sides becomes the content of the shared website.
        var agreedLeft = find('.principle-dialogue-agreed-left');
        var agreedRight = find('.principle-dialogue-agreed-right');
        var pageCopy = find('.principle-dialogue-page-copy');
        var pageImage = find('.principle-dialogue-page-image');
        var pageAction = find('.principle-dialogue-page-action');
        tl.set([agreedLeft, agreedRight, pageCopy, pageImage, pageAction], { opacity: 0 }, 0);
        travel(agreedLeft, panel.querySelector('.principle-dialogue-agreement--left'), 0, 0, 1.02, 0.2);
        travel(agreedRight, panel.querySelector('.principle-dialogue-agreement--right'), 0, 0, 1.06, 0.2);
        tl.to(agreedLeft, { opacity: 0, duration: 0.03 }, 1.235)
          .to(agreedRight, { opacity: 0, duration: 0.03 }, 1.275)
          .to(pageCopy, { opacity: 1, duration: 0.14 }, 1.23)
          .to(pageImage, { opacity: 1, duration: 0.14 }, 1.27)
          .to(pageAction, { opacity: 1, duration: 0.12 }, 1.42)
          .to([pageCopy, pageImage, pageAction], { opacity: 0, duration: 0.18 }, 1.98)
          .to({}, { duration: 0.12 }, 2.16);
      }

      tl.timeScale(0.2).play();
    });
  });
})();
