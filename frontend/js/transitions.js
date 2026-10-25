/* ============================================================
   transitions.js — Page Transition System
   Creates a bubble-expand overlay when navigating between pages.
   Add data-transition to any <a> to trigger it.
   ============================================================ */

(function () {
  // Don't run on auth pages or if already transitioning
  if (document.querySelector('.pd-loading-overlay')) return;

  // Create the transition overlay
  const overlay = document.createElement('div');
  overlay.className = 'page-transition';
  overlay.innerHTML = '<div class="page-transition__circle"></div>';
  document.body.appendChild(overlay);

  const circle = overlay.querySelector('.page-transition__circle');

  // Intercept all links with data-transition attribute
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-transition]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' || href.startsWith('javascript:')) return;

    e.preventDefault();

    // Get click coordinates for the bubble origin
    const rect = link.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    // Calculate the radius needed to cover the whole viewport
    const maxDim = Math.max(window.innerWidth, window.innerHeight);
    const radius = maxDim * 1.5;

    // Position and expand the circle
    circle.style.left = originX + 'px';
    circle.style.top = originY + 'px';
    circle.style.width = '0px';
    circle.style.height = '0px';

    // Show overlay and animate
    overlay.classList.add('page-transition--active');
    circle.classList.add('page-transition__circle--expand');

    // Navigate after animation reaches peak
    setTimeout(() => {
      window.location.href = href;
    }, 400);
  });

  // On page load, fade in from black
  window.addEventListener('load', () => {
    overlay.classList.add('page-transition--enter');
    circle.classList.add('page-transition__circle--shrink');
    setTimeout(() => {
      overlay.classList.remove('page-transition--active', 'page-transition--enter');
      circle.classList.remove('page-transition__circle--shrink');
    }, 400);
  });
})();
