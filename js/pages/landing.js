/* ============================================================
   landing.js — Landing Page Controller
   Ambient bubble background (decorative, no real data),
   hero animation timing, CTA navigation wiring.
   ============================================================ */

// ── Ambient Bubble Background ──
// Simplified physics for decorative-only bubbles on the landing page.
// Full interactive bubble pool comes on Day 4.

const canvas = document.getElementById('landing-bubble-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const BUBBLE_COUNT = 12;
const AMBIENT_SPEED = 0.3;
const AMBIENT_COLORS = [
  'rgba(62, 220, 132, 0.08)',   // green
  'rgba(62, 220, 132, 0.05)',
  'rgba(244, 201, 59, 0.06)',   // yellow
  'rgba(245, 136, 62, 0.05)',   // orange
  'rgba(255, 255, 255, 0.03)',  // white ghost
];

let bubbles = [];
let animFrameId = null;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createBubble() {
  const radius = 20 + Math.random() * 80;
  return {
    x: Math.random() * (canvas ? canvas.width : window.innerWidth),
    y: Math.random() * (canvas ? canvas.height : window.innerHeight),
    vx: (Math.random() - 0.5) * AMBIENT_SPEED,
    vy: (Math.random() - 0.5) * AMBIENT_SPEED,
    radius,
    color: AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)],
    phase: Math.random() * Math.PI * 2,  // for sine drift
  };
}

function initBubbles() {
  bubbles = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    bubbles.push(createBubble());
  }
}

function updateBubbles(time) {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const t = time * 0.001; // seconds

  bubbles.forEach((b) => {
    // Sine-based drift for organic movement
    b.x += b.vx + Math.sin(t * 0.5 + b.phase) * 0.15;
    b.y += b.vy + Math.cos(t * 0.3 + b.phase) * 0.1;

    // Wrap around edges
    if (b.x < -b.radius) b.x = canvas.width + b.radius;
    if (b.x > canvas.width + b.radius) b.x = -b.radius;
    if (b.y < -b.radius) b.y = canvas.height + b.radius;
    if (b.y > canvas.height + b.radius) b.y = -b.radius;

    // Draw
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  });

  animFrameId = requestAnimationFrame(updateBubbles);
}

// ── Start ambient animation ──
function startAmbient() {
  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  resizeCanvas();
  initBubbles();
  animFrameId = requestAnimationFrame(updateBubbles);
}

// ── Stop ambient animation ──
function stopAmbient() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

// ── CTA Navigation Wiring ──
function initCTAs() {
  const getStartedBtn = document.getElementById('landing-get-started');
  const loginBtn = document.getElementById('landing-login');
  const signupBtn = document.getElementById('landing-signup');

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      window.location.href = 'signup.html';
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      window.location.href = 'signup.html';
    });
  }
}

// ── Resize handler ──
window.addEventListener('resize', resizeCanvas);

// ── Init on load ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startAmbient();
    initCTAs();
  });
} else {
  startAmbient();
  initCTAs();
}

// ── Cleanup on page unload ──
window.addEventListener('beforeunload', stopAmbient);
