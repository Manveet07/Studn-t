/* ============================================================
   landing.js — Magical Landing Page Renderer
   Massive central orb, cursor-reactive floating bubbles,
   twinkling stars, glitter particles, canvas cursor glow.
   ============================================================ */

const canvas = document.getElementById('landing-sphere-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// ── Mouse tracking (shared across all systems) ──
let mouseX = -9999;
let mouseY = -9999;
let mouseOnScreen = false;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  mouseOnScreen = true;
});
document.addEventListener('mouseleave', () => {
  mouseOnScreen = false;
});

// ── Constants ──
const BUBBLE_COUNT = 22;
const STAR_COUNT = 50;
const GLITTER_COUNT = 30;
const CURSOR_REPEL_RADIUS = 180;
const CURSOR_REPEL_STRENGTH = 3.5;
const BOUNCE_DAMPING = 0.92;
const BUBBLE_RETURN_FORCE = 0.008;

// ── Canvas Setup ──
function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  if (ctx) ctx.scale(dpr, dpr);
}

// ═══════════════════════════════════════════════════════════════
// CENTRAL ORB — Massive glowing sphere at center-bottom
// ═══════════════════════════════════════════════════════════════

const centralOrb = {
  x: 0, y: 0,
  radius: 0,
  // Colors
  baseColor: [0, 200, 255],
  secondaryColor: [0, 120, 220],
  // Animation
  phase: 0,
};

function updateOrb() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  centralOrb.x = w * 0.5;
  centralOrb.y = h * 0.72;
  centralOrb.radius = Math.min(w, h) * 0.28;
}

function drawCentralOrb(time) {
  const { x, y, radius } = centralOrb;
  const t = time * 0.001;

  ctx.save();

  // ── Outer atmosphere glow ──
  const atmoR = radius * 2.2;
  const atmoGrad = ctx.createRadialGradient(x, y, radius * 0.6, x, y, atmoR);
  atmoGrad.addColorStop(0, 'rgba(0, 200, 255, 0.10)');
  atmoGrad.addColorStop(0.3, 'rgba(0, 150, 255, 0.05)');
  atmoGrad.addColorStop(0.7, 'rgba(0, 100, 200, 0.02)');
  atmoGrad.addColorStop(1, 'rgba(0, 50, 150, 0)');
  ctx.beginPath();
  ctx.arc(x, y, atmoR, 0, Math.PI * 2);
  ctx.fillStyle = atmoGrad;
  ctx.fill();

  // ── Base sphere ──
  const baseGrad = ctx.createRadialGradient(
    x - radius * 0.2, y - radius * 0.25, radius * 0.05,
    x, y, radius
  );
  baseGrad.addColorStop(0, 'rgba(100, 230, 255, 0.8)');
  baseGrad.addColorStop(0.15, 'rgba(0, 200, 255, 0.7)');
  baseGrad.addColorStop(0.4, 'rgba(0, 160, 240, 0.5)');
  baseGrad.addColorStop(0.7, 'rgba(0, 100, 220, 0.35)');
  baseGrad.addColorStop(1, 'rgba(0, 60, 160, 0.12)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // ── Internal energy swirls (animated) ──
  for (let i = 0; i < 3; i++) {
    const angle = t * (0.15 + i * 0.05) + i * Math.PI * 0.66;
    const dist = radius * (0.15 + i * 0.1);
    const sx = x + Math.cos(angle) * dist;
    const sy = y + Math.sin(angle) * dist * 0.7;
    const sr = radius * (0.25 + i * 0.05);

    const swirlGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    swirlGrad.addColorStop(0, `rgba(150, 240, 255, ${0.2 - i * 0.04})`);
    swirlGrad.addColorStop(0.5, `rgba(0, 200, 255, ${0.08 - i * 0.02})`);
    swirlGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = swirlGrad;
    ctx.fill();
  }

  // ── Edge rim (fresnel) ──
  const rimGrad = ctx.createRadialGradient(x, y, radius * 0.65, x, y, radius);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.92, 'rgba(180, 240, 255, 0.2)');
  rimGrad.addColorStop(1, 'rgba(100, 220, 255, 0.1)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // ── Primary specular highlight ──
  const hlX = x - radius * 0.22;
  const hlY = y - radius * 0.32;
  const hlR = radius * 0.32;
  const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  hlGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.2)');
  hlGrad.addColorStop(0.6, 'rgba(200, 240, 255, 0.05)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  // ── Secondary small highlight ──
  const hl2X = x + radius * 0.15;
  const hl2Y = y + radius * 0.2;
  const hl2R = radius * 0.08;
  const hl2Grad = ctx.createRadialGradient(hl2X, hl2Y, 0, hl2X, hl2Y, hl2R);
  hl2Grad.addColorStop(0, 'rgba(180, 240, 255, 0.35)');
  hl2Grad.addColorStop(1, 'rgba(180, 240, 255, 0)');
  ctx.beginPath();
  ctx.arc(hl2X, hl2Y, hl2R, 0, Math.PI * 2);
  ctx.fillStyle = hl2Grad;
  ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// FLOATING BUBBLES — Cursor-reactive, bounce back
// ═══════════════════════════════════════════════════════════════

let bubbles = [];

const BUBBLE_PALETTES = [
  { base: [0, 229, 255],   secondary: [58, 180, 255],   highlight: [200, 255, 255] },
  { base: [0, 210, 160],   secondary: [0, 180, 220],    highlight: [200, 255, 240] },
  { base: [0, 150, 255],   secondary: [0, 229, 200],    highlight: [180, 240, 255] },
  { base: [0, 200, 220],   secondary: [0, 140, 255],    highlight: [200, 255, 255] },
  { base: [80, 180, 255],  secondary: [0, 200, 200],    highlight: [200, 240, 255] },
  { base: [0, 230, 200],   secondary: [0, 160, 255],    highlight: [200, 255, 245] },
];

function createBubble() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const palette = BUBBLE_PALETTES[Math.floor(Math.random() * BUBBLE_PALETTES.length)];
  const radius = 6 + Math.random() * 30;

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    homeX: 0, homeY: 0, // will be set
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    radius,
    palette,
    phase: Math.random() * Math.PI * 2,
    highlightAngle: Math.random() * Math.PI * 2,
    blur: radius < 12 ? 0.5 + Math.random() : 0,
  };
}

function initBubbles() {
  bubbles = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const b = createBubble();
    b.homeX = b.x;
    b.homeY = b.y;
    bubbles.push(b);
  }
}

function updateBubbles(dt, time) {
  const t = time * 0.001;

  bubbles.forEach((b) => {
    // Organic drift
    b.vx += Math.sin(t * 0.3 + b.phase) * 0.005;
    b.vy += Math.cos(t * 0.25 + b.phase) * 0.004;

    // Gentle return toward home position
    b.vx += (b.homeX - b.x) * BUBBLE_RETURN_FORCE;
    b.vy += (b.homeY - b.y) * BUBBLE_RETURN_FORCE;

    // Cursor repulsion — bounce away
    if (mouseOnScreen) {
      const dx = b.x - mouseX;
      const dy = b.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CURSOR_REPEL_RADIUS && dist > 0) {
        const force = (1 - dist / CURSOR_REPEL_RADIUS) * CURSOR_REPEL_STRENGTH;
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      }
    }

    // Apply velocity with damping (bounce feel)
    b.vx *= BOUNCE_DAMPING;
    b.vy *= BOUNCE_DAMPING;
    b.x += b.vx;
    b.y += b.vy;

    // Highlight slowly rotates
    b.highlightAngle += 0.003;
  });
}

function drawBubbles(time) {
  const t = time * 0.001;

  bubbles.forEach((b) => {
    const { x, y, radius, palette, highlightAngle } = b;

    ctx.save();
    if (b.blur > 0) ctx.filter = `blur(${b.blur}px)`;

    // Outer glow
    const glowR = radius * 2;
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowR);
    glowGrad.addColorStop(0, `rgba(${palette.base.join(',')}, 0.12)`);
    glowGrad.addColorStop(0.6, `rgba(${palette.base.join(',')}, 0.03)`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Base
    const shimmer = Math.sin(t * 0.5 + b.phase) * 0.2;
    const gx = x + Math.cos(highlightAngle + shimmer) * radius * 0.25;
    const gy = y + Math.sin(highlightAngle + shimmer) * radius * 0.25;
    const baseGrad = ctx.createRadialGradient(gx, gy, 0, x, y, radius);
    baseGrad.addColorStop(0, `rgba(${palette.base.join(',')}, 0.7)`);
    baseGrad.addColorStop(0.5, `rgba(${palette.secondary.join(',')}, 0.4)`);
    baseGrad.addColorStop(1, `rgba(${palette.secondary.join(',')}, 0.08)`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // Specular
    const hx = x + Math.cos(highlightAngle) * radius * 0.25;
    const hy = y + Math.sin(highlightAngle) * radius * 0.2 - radius * 0.1;
    const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius * 0.3);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
    hlGrad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    ctx.restore();
  });
}

// ═══════════════════════════════════════════════════════════════
// TWINKLING STARS — Small points that fade in/out
// ═══════════════════════════════════════════════════════════════

let stars = [];

function initStars() {
  stars = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    });
  }
}

function drawStars(time) {
  const t = time * 0.001;

  stars.forEach((s) => {
    const alpha = 0.15 + Math.sin(t * s.speed + s.phase) * 0.5 * 0.5 + 0.25;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 230, 255, ${Math.max(0, alpha)})`;
    ctx.fill();
  });
}

// ═══════════════════════════════════════════════════════════════
// GLITTER PARTICLES — Tiny bright sparks that drift and fade
// ═══════════════════════════════════════════════════════════════

let glitters = [];

function initGlitters() {
  glitters = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < GLITTER_COUNT; i++) {
    glitters.push(createGlitter(w, h));
  }
}

function createGlitter(w, h) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: 1 + Math.random() * 2,
    life: Math.random(), // 0..1, cycles
    speed: 0.002 + Math.random() * 0.006,
    driftX: (Math.random() - 0.5) * 0.3,
    driftY: -0.1 - Math.random() * 0.3, // float upward
    color: Math.random() > 0.5
      ? [0, 229, 255]   // cyan
      : [180, 220, 255], // pale blue-white
  };
}

function updateGlitters(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const t = time * 0.001;

  glitters.forEach((g) => {
    g.life += g.speed;
    if (g.life > 1) {
      // Respawn
      Object.assign(g, createGlitter(w, h));
      g.y = h + 5; // start from bottom
    }
    g.x += g.driftX + Math.sin(t + g.x * 0.01) * 0.1;
    g.y += g.driftY;
  });
}

function drawGlitters() {
  glitters.forEach((g) => {
    // Fade in at start, fade out at end
    const alpha = g.life < 0.1 ? g.life / 0.1
      : g.life > 0.8 ? (1 - g.life) / 0.2
      : 1;
    const a = Math.max(0, Math.min(1, alpha)) * 0.8;

    // Bright core
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${g.color.join(',')}, ${a})`;
    ctx.fill();

    // Tiny glow
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${g.color.join(',')}, ${a * 0.15})`;
    ctx.fill();
  });
}

// ═══════════════════════════════════════════════════════════════
// CURSOR GLOW — Soft halo on canvas following mouse
// ═══════════════════════════════════════════════════════════════

function drawCursorGlow() {
  if (!mouseOnScreen) return;

  const glowR = 120;
  const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, glowR);
  grad.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
  grad.addColorStop(0.3, 'rgba(0, 180, 216, 0.03)');
  grad.addColorStop(0.7, 'rgba(0, 150, 255, 0.01)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════

let animFrameId = null;
let lastTime = 0;

function animate(time) {
  if (!canvas || !ctx) return;

  const dt = time - lastTime;
  lastTime = time;

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // ── Background ──
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
  bgGrad.addColorStop(0, '#0a1628');
  bgGrad.addColorStop(0.5, '#060e1f');
  bgGrad.addColorStop(1, '#050a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // ── Ambient blue glow behind orb ──
  const ambGrad = ctx.createRadialGradient(w * 0.5, h * 0.68, 0, w * 0.5, h * 0.68, w * 0.35);
  ambGrad.addColorStop(0, 'rgba(0, 100, 200, 0.07)');
  ambGrad.addColorStop(0.5, 'rgba(0, 60, 150, 0.03)');
  ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambGrad;
  ctx.fillRect(0, 0, w, h);

  // ── Draw layers in order (back to front) ──
  drawStars(time);
  drawGlitters();
  drawCursorGlow();
  updateBubbles(dt, time);
  drawBubbles(time);
  updateGlitters(time);
  drawCentralOrb(time);

  animFrameId = requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  resizeCanvas();
  updateOrb();
  initBubbles();
  initStars();
  initGlitters();
  animFrameId = requestAnimationFrame(animate);
}

function initCTAs() {
  const getStartedBtn = document.getElementById('landing-get-started');
  const getStartedNav = document.getElementById('landing-get-started-nav');
  const loginBtn = document.getElementById('landing-login');

  const goToSignup = () => { window.location.href = 'signup.html'; };
  const goToLogin = () => { window.location.href = 'login.html'; };

  if (getStartedBtn) getStartedBtn.addEventListener('click', goToSignup);
  if (getStartedNav) getStartedNav.addEventListener('click', goToSignup);
  if (loginBtn) loginBtn.addEventListener('click', goToLogin);
}

// ── Respect reduced motion ──
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Static frame only
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resizeCanvas();
      updateOrb();
      initBubbles();
      initStars();
      initGlitters();
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      // Draw background
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
      bgGrad.addColorStop(0, '#0a1628');
      bgGrad.addColorStop(1, '#050a14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
      drawStars(0);
      drawGlitters();
      drawBubbles(0);
      drawCentralOrb(0);
      initCTAs();
    });
  }
} else {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initCTAs();
    });
  } else {
    init();
    initCTAs();
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  updateOrb();
  // Re-seed stars and glitters on resize
  initStars();
  initGlitters();
});

window.addEventListener('beforeunload', () => {
  if (animFrameId) cancelAnimationFrame(animFrameId);
});
