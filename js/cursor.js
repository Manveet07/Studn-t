/* ============================================================
   cursor.js — Glowing Custom Cursor + Magnetic Buttons
   Standalone, no data dependencies.
   Used from Day 1 onward on every page.
   ============================================================ */

const cursor = document.getElementById('pd-cursor');
const cursorGlow = document.getElementById('pd-cursor-glow');
let cursorVisible = false;
let curX = -100, curY = -100;
let targetX = -100, targetY = -100;

// ── Smooth cursor follow with lerp ──
document.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;

  if (!cursorVisible && cursor) {
    cursor.style.opacity = '1';
    if (cursorGlow) cursorGlow.style.opacity = '1';
    cursorVisible = true;
    document.body.classList.add('pd-cursor-active');
  }
});

document.addEventListener('mouseleave', () => {
  if (cursor) cursor.style.opacity = '0';
  if (cursorGlow) cursorGlow.style.opacity = '0';
  cursorVisible = false;
  document.body.classList.remove('pd-cursor-active');
});

// Smooth interpolation loop
function updateCursor() {
  const lerp = 0.15;
  curX += (targetX - curX) * lerp;
  curY += (targetY - curY) * lerp;

  if (cursor) {
    cursor.style.left = `${curX}px`;
    cursor.style.top = `${curY}px`;
  }

  if (cursorGlow) {
    cursorGlow.style.left = `${curX}px`;
    cursorGlow.style.top = `${curY}px`;
  }

  requestAnimationFrame(updateCursor);
}

requestAnimationFrame(updateCursor);

// ── Cursor grows on interactive elements ──
function initCursorHover() {
  const targets = document.querySelectorAll('a, button, [data-cursor-hover]');

  targets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (cursor) {
        cursor.style.width = '32px';
        cursor.style.height = '32px';
        cursor.style.background = 'rgba(0, 229, 255, 0.7)';
        cursor.style.boxShadow = '0 0 16px rgba(0, 229, 255, 0.5)';
      }
    });
    el.addEventListener('mouseleave', () => {
      if (cursor) {
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.background = 'rgba(255, 255, 255, 0.8)';
        cursor.style.boxShadow = '0 0 6px rgba(255, 255, 255, 0.4)';
      }
    });
  });
}

// ── Magnetic button behavior ──
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

// ── Init ──
function init() {
  initMagneticButtons();
  initCursorHover();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export function reinitCursor() {
  initMagneticButtons();
  initCursorHover();
}
