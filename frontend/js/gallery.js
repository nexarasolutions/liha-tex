/**
 * Liha Tex — category photo sets.
 * Each product card holds a `.shots` stack; images advance on a timer and slide
 * in from the left, so the set reads as a left → right filmstrip.
 * Pauses off-screen and honours prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stacks = Array.prototype.slice.call(document.querySelectorAll('[data-shots]'));

  stacks.forEach(function (stack) {
    var shots = Array.prototype.slice.call(stack.querySelectorAll('.shot'));
    var dots = stack.parentElement.querySelectorAll('.shot-dots i');
    if (shots.length < 2) return;

    var index = 0;
    var timer = null;
    var visible = true;

    function paint(next) {
      shots.forEach(function (img, i) {
        img.classList.toggle('on', i === next);
      });
      Array.prototype.forEach.call(dots, function (dot, i) {
        dot.classList.toggle('on', i === next);
      });
    }

    function advance() {
      index = (index + 1) % shots.length;
      paint(index);
    }

    function play() {
      if (reduce || timer || !visible) return;
      timer = setInterval(advance, 4200);
    }

    function pause() {
      clearInterval(timer);
      timer = null;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play(); else pause();
      }, { threshold: 0.25 }).observe(stack);
    } else {
      play();
    }

    stack.parentElement.addEventListener('pointerenter', pause);
    stack.parentElement.addEventListener('pointerleave', play);

    paint(0);
    play();
  });
})();
