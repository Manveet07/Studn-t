/* ============================================================
   cursor.js — Custom Cursor + Magnetic Buttons
   Standalone, no data dependencies.
   Used from Day 1 onward on every page.
   ============================================================ */

const cursor = document.getElementById('pd-cursor');
let cursorVisible = false;

// ── Track mouse, update cursor position ──
document.addEventListener('mousemove', (e) => {
  if (!cursor) return;

  if (!cursorVisible) {
    cursor.style.opacity = '1';
    cursorVisible = true;
  }

  cursor.style.left = `${e.clientX}px`;
  cursor.style.top = `${e.clientY}px`;
});

// ── Hide cursor when mouse leaves window ──
document.addEventListener('mouseleave', () => {
  if (!cursor) return;
  cursor.style.opacity = '0';
  cursorVisible = false;
});

// ── Magnetic button behavior for primary CTAs ──
// On mousemove within ~40px, translate button up to 6px toward cursor
const MAGNETIC_RADIUS = 40;
const MAGNETIC_STRENGTH = 6;

function initMagneticButtons() {
  const magneticButtons = document.querySelectorAll('.pd-btn--primary, .pd-btn--magnetic');

  magneticButtons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MAGNETIC_RADIUS) {
        const pullX = (dx / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
        const pullY = (dy / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
        btn.style.transform = `translate(${pullX}px, ${pullY}px)`;
      } else {
        btn.style.transform = '';
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ── Cursor hover detection for interactive elements ──
function initCursorHover() {
  const hoverTargets = document.querySelectorAll('a, button, [data-cursor-hover]');

  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (cursor) cursor.classList.add('pd-cursor--hovering');
    });
    el.addEventListener('mouseleave', () => {
      if (cursor) cursor.classList.remove('pd-cursor--hovering');
    });
  });
}

// ── Initialize on DOM ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initMagneticButtons();
    initCursorHover();
  });
} else {
  initMagneticButtons();
  initCursorHover();
}

// ── Export for re-init after dynamic content changes ──
export function reinitCursor() {
  initMagneticButtons();
  initCursorHover();
}
