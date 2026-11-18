/**
 * Liha Tex — section rail, scroll progress and active nav state.
 * Builds the right-hand module rail from the real sections in the page.
 */
(function () {
  'use strict';

  var LABELS = {
    home: 'Top',
    collection: 'Range',
    craft: 'Craft',
    why: 'Why Liha',
    store: 'Store',
    enquiry: 'Bulk',
    soon: 'Online',
    contact: 'Contact',
  };

  var sections = Array.prototype.slice
    .call(document.querySelectorAll('main section[id], section[id]'))
    .filter(function (s, i, all) { return all.indexOf(s) === i; });

  var rail = document.getElementById('moduleRail');
  var progress = document.getElementById('progressBar');
  var links = [];

  if (rail && !rail.children.length) {
    sections.forEach(function (section) {
      var id = section.id;
      if (!LABELS[id]) return;

      var link = document.createElement('a');
      link.href = '#' + id;
      link.innerHTML =
        '<span class="rail-label">' + LABELS[id] + '</span><span class="rail-dot"></span>';
      link.setAttribute('aria-label', LABELS[id]);
      rail.appendChild(link);
      links.push({ link: link, section: section });
    });
  }

  function scrollProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        scrollProgress();
        ticking = false;
      });
    },
    { passive: true },
  );

  if (links.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (item) {
            item.link.classList.toggle('active', item.section === entry.target);
          });
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    links.forEach(function (item) { observer.observe(item.section); });
  }

  scrollProgress();
})();
