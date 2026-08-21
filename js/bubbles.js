/* ============================================================
   bubbles.js — Interactive Bubble Pool Canvas
   Renders doubts as floating bubbles on a canvas.
   - Bubble size = urgency (bigger = more urgent)
   - Bubble color = match strength (blue = high, gray = low)
   - Bubbles react to cursor (repel on hover, bounce back)
   - Click a bubble to see doubt details
   - New doubts spawn with entrance animation

   Dependencies: NONE (pure canvas rendering)
   ============================================================ */

let canvas, ctx;
let bubbles = [];
let popAnimations = [];
let mouseX = -9999, mouseY = -9999;
let mouseOnScreen = false;
let selectedBubble = null;
let onBubbleClick = null;

// ── Config ──
const BUBBLE_PADDING = 20;
const CURSOR_REPEL_RADIUS = 100;
const CURSOR_REPEL_STRENGTH = 2;
const BOUNCE_DAMPING = 0.9;
const RETURN_FORCE = 0.01;
const MIN_RADIUS = 24;
const MAX_RADIUS = 60;

// ── Color Palettes (by match strength) ──
const MATCH_COLORS = {
  high:   { base: [37, 99, 160],  glow: [56, 189, 248],  text: '#60a5fa' },
  medium: { base: [30, 80, 140],  glow: [80, 140, 200],  text: '#93c5fd' },
  low:    { base: [40, 50, 70],   glow: [80, 90, 110],   text: '#8893a4' },
};

/**
 * Initialize the bubble pool canvas.
 *
 * @param {HTMLCanvasElement} canvasEl
 * @param {Function} clickHandler - called with (doubtId) when a bubble is clicked
 */
export function initBubblePool(canvasEl, clickHandler) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  onBubbleClick = clickHandler;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', () => { mouseOnScreen = false; });
  canvas.addEventListener('click', handleClick);

  requestAnimationFrame(animate);
}

/**
 * Update the bubble pool with new doubts.
 * Matches existing bubbles to doubts, creates new ones, removes stale ones.
 *
 * @param {Object[]} doubts - array of doubt objects
 * @param {Object|null} currentUser - for match score calculation
 * @param {Function} matchFn - matchScore(doubt, user) => 0..1
 */
export function updateBubbles(doubts, currentUser, matchFn) {
  const activeDoubts = doubts.filter((d) => d.status === 'open' || d.status === 'claimed');

  // Remove bubbles for doubts that no longer exist — trigger pop animation
  const removedBubbles = bubbles.filter((b) => !activeDoubts.some((d) => d.id === b.doubtId));
  removedBubbles.forEach((b) => {
    popAnimations.push({
      x: b.x, y: b.y, radius: b.radius, colors: b.colors,
      startTime: Date.now(), duration: 400,
    });
  });
  bubbles = bubbles.filter((b) => activeDoubts.some((d) => d.id === b.doubtId));

  // Add/update bubbles for active doubts
  activeDoubts.forEach((doubt) => {
    let existing = bubbles.find((b) => b.doubtId === doubt.id);

    const match = currentUser ? matchFn(doubt, currentUser) : 0.5;
    const radius = urgencyToRadius(doubt.urgency);
    const colors = matchToColors(match);

    if (existing) {
      // Update properties
      existing.doubt = doubt;
      existing.match = match;
      existing.radius = radius;
      existing.colors = colors;
      existing.label = truncate(doubt.description, 30);
      existing.urgency = doubt.urgency;
    } else {
      // Create new bubble
      const pos = findEmptySpot(radius);
      bubbles.push({
        doubtId: doubt.id,
        doubt,
        match,
        x: pos.x,
        y: pos.y,
        homeX: pos.x,
        homeY: pos.y,
        vx: 0,
        vy: 0,
        radius,
        colors,
        label: truncate(doubt.description, 30),
        urgency: doubt.urgency,
        phase: Math.random() * Math.PI * 2,
        spawnTime: Date.now(),
        status: doubt.status,
      });
    }
  });
}

/**
 * Remove a specific bubble by doubt ID.
 */
export function removeBubble(doubtId) {
  bubbles = bubbles.filter((b) => b.doubtId !== doubtId);
}

/**
 * Get the currently selected bubble's doubt ID.
 */
export function getSelectedBubbleId() {
  return selectedBubble ? selectedBubble.doubtId : null;
}

// ── Internal ──

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  mouseOnScreen = true;
}

function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Find clicked bubble (check from top/front)
  let clicked = null;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const dist = Math.sqrt((clickX - b.x) ** 2 + (clickY - b.y) ** 2);
    if (dist < b.radius) {
      clicked = b;
      break;
    }
  }

  if (clicked) {
    selectedBubble = clicked;
    if (onBubbleClick) onBubbleClick(clicked.doubtId);
  } else {
    selectedBubble = null;
  }
}

function urgencyToRadius(urgency) {
  // Map 0..100 urgency to MIN_RADIUS..MAX_RADIUS
  return MIN_RADIUS + (urgency / 100) * (MAX_RADIUS - MIN_RADIUS);
}

function matchToColors(match) {
  if (match >= 0.6) return MATCH_COLORS.high;
  if (match >= 0.3) return MATCH_COLORS.medium;
  return MATCH_COLORS.low;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function findEmptySpot(radius) {
  if (!canvas) return { x: 100, y: 100 };
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  // Try random positions until we find one without overlap
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = radius + BUBBLE_PADDING + Math.random() * (w - 2 * radius - 2 * BUBBLE_PADDING);
    const y = radius + BUBBLE_PADDING + Math.random() * (h - 2 * radius - 2 * BUBBLE_PADDING);

    let overlaps = false;
    for (const b of bubbles) {
      const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
      if (dist < radius + b.radius + BUBBLE_PADDING) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) return { x, y };
  }

  // Fallback: just place it somewhere
  return {
    x: radius + Math.random() * (w - 2 * radius),
    y: radius + Math.random() * (h - 2 * radius),
  };
}

// ── Animation Loop ──

function animate(time) {
  if (!canvas || !ctx) return;

  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.clearRect(0, 0, w, h);

  // Update physics
  updateBubblesPhysics(time);

  // Draw pop animations
  drawPopAnimations();

  // Draw bubbles
  drawBubbles(time);

  requestAnimationFrame(animate);
}

function updateBubblesPhysics(time) {
  const t = time * 0.001;

  bubbles.forEach((b) => {
    // Organic drift
    b.vx += Math.sin(t * 0.4 + b.phase) * 0.003;
    b.vy += Math.cos(t * 0.3 + b.phase) * 0.003;

    // Return to home position
    b.vx += (b.homeX - b.x) * RETURN_FORCE;
    b.vy += (b.homeY - b.y) * RETURN_FORCE;

    // Cursor repulsion
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

    // Damping
    b.vx *= BOUNCE_DAMPING;
    b.vy *= BOUNCE_DAMPING;

    // Apply velocity
    b.x += b.vx;
    b.y += b.vy;

    // Keep within bounds
    const canvasW = canvas.getBoundingClientRect().width;
    const canvasH = canvas.getBoundingClientRect().height;
    if (b.x < b.radius) { b.x = b.radius; b.vx *= -0.5; }
    if (b.x > canvasW - b.radius) { b.x = canvasW - b.radius; b.vx *= -0.5; }
    if (b.y < b.radius) { b.y = b.radius; b.vy *= -0.5; }
    if (b.y > canvasH - b.radius) { b.y = canvasH - b.radius; b.vy *= -0.5; }
  });
}

function drawPopAnimations() {
  const now = Date.now();
  popAnimations = popAnimations.filter((p) => {
    const elapsed = now - p.startTime;
    if (elapsed > p.duration) return false;

    const progress = elapsed / p.duration;
    const easeOut = 1 - Math.pow(1 - progress, 3);

    ctx.save();

    // Expanding ring
    const ringRadius = p.radius * (1 + easeOut * 1.5);
    const ringAlpha = (1 - progress) * 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${p.colors.glow.join(',')}, ${ringAlpha})`;
    ctx.lineWidth = 2 * (1 - progress);
    ctx.stroke();

    // Scattered particles
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = p.radius * easeOut * 1.2;
      const px = p.x + Math.cos(angle) * dist;
      const py = p.y + Math.sin(angle) * dist;
      const particleAlpha = (1 - progress) * 0.6;
      const particleSize = 2 * (1 - progress);
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.colors.glow.join(',')}, ${particleAlpha})`;
      ctx.fill();
    }

    ctx.restore();
    return true;
  });
}

function drawBubbles(time) {
  const t = time * 0.001;

  bubbles.forEach((b) => {
    const { x, y, radius, colors, label, status, urgency, match } = b;
    const isSelected = selectedBubble && selectedBubble.doubtId === b.doubtId;

    ctx.save();

    // Spawn animation
    const age = (Date.now() - b.spawnTime) / 1000;
    const spawnScale = Math.min(1, age / 0.5);
    const easedScale = 1 - Math.pow(1 - spawnScale, 3);

    ctx.translate(x, y);
    ctx.scale(easedScale, easedScale);
    ctx.translate(-x, -y);

    // Glow
    const glowR = radius * 2.2;
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowR);
    glowGrad.addColorStop(0, `rgba(${colors.glow.join(',')}, 0.1)`);
    glowGrad.addColorStop(0.5, `rgba(${colors.glow.join(',')}, 0.03)`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Base sphere
    const shimmer = Math.sin(t * 0.5 + b.phase) * 0.15;
    const gx = x + shimmer * radius * 0.3;
    const gy = y - radius * 0.1;
    const baseGrad = ctx.createRadialGradient(gx, gy, 0, x, y, radius);
    baseGrad.addColorStop(0, `rgba(${colors.base.join(',')}, 0.6)`);
    baseGrad.addColorStop(0.5, `rgba(${colors.base.join(',')}, 0.35)`);
    baseGrad.addColorStop(1, `rgba(${colors.base.join(',')}, 0.08)`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected
      ? `rgba(${colors.glow.join(',')}, 0.6)`
      : `rgba(${colors.glow.join(',')}, 0.15)`;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Specular highlight
    const hlX = x - radius * 0.25;
    const hlY = y - radius * 0.3;
    const hlR = radius * 0.25;
    const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    // Label text
    if (radius > 28) {
      ctx.font = `500 ${Math.max(9, radius * 0.22)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.text;
      ctx.fillText(label, x, y + radius * 0.1, radius * 1.6);
    }

    // Urgency indicator (small dot at top)
    if (urgency > 70) {
      ctx.beginPath();
      ctx.arc(x, y - radius + 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f87171';
      ctx.fill();
    }

    // Status ring for claimed
    if (status === 'claimed') {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}
