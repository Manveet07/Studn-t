/* ============================================================
   bubbles.js — Interactive Bubble Pool Canvas
   Renders doubts as floating bubbles on a canvas.
   - Bubble size = urgency (bigger = more urgent)
   - Bubble color = match strength (bright blue = high, dim blue = low)
   - Hover shows tooltip with tag, urgency, match %
   - Click a bubble to see doubt details
   - New doubts spawn with entrance animation

   Dependencies: NONE (pure canvas rendering)
   ============================================================ */

let canvas, ctx;
let bubbles = [];
let popAnimations = [];
let mouseX = -9999, mouseY = -9999;
let mouseOnScreen = false;
let hoveredBubble = null;
let selectedBubble = null;
let onBubbleClick = null;

// ── Tooltip element (DOM, sits on top of canvas) ──
let tooltipEl = null;

// ── Config ──
const BUBBLE_PADDING = 24;
const BOUNCE_DAMPING = 0.94;
const MIN_RADIUS = 32;
const MAX_RADIUS = 72;
const BUBBLE_REPEL_STRENGTH = 0.8;
const DRIFT_SPEED = 0.015;

// ── Match-based color: brightness scales with match % ──
function matchToColors(match) {
  // Bright cyan-blue at 100%, dim navy at 0%
  const brightness = 0.2 + match * 0.8; // 0.2..1.0
  const r = Math.round(20 + match * 17);   // 20..37
  const g = Math.round(50 + match * 49);   // 50..99
  const b = Math.round(80 + match * 80);   // 80..160
  const gr = Math.round(40 + match * 49);  // 40..89
  const gg = Math.round(100 + match * 89); // 100..189
  const gb = Math.round(160 + match * 88); // 160..248
  const textAlpha = 0.4 + match * 0.6;
  return {
    base: [r, g, b],
    glow: [gr, gg, gb],
    text: `rgba(${Math.round(100 + match * 100)}, ${Math.round(160 + match * 80)}, 250, ${textAlpha})`,
    brightness,
  };
}

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
  // Re-resize after layout settles (handles race with flex/grid rendering)
  setTimeout(resizeCanvas, 100);
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('click', handleClick);

  // Create tooltip element
  createTooltip();

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
      existing.tag = (doubt.tags && doubt.tags[0]) ? doubt.tags[0] : (doubt.category === 'academic' ? 'Academic' : 'Other');
      // Reposition if bubble was placed at fallback (100, 100) when canvas was null
      if (existing.homeX === 100 && existing.homeY === 100 && canvas) {
        const pos = findEmptySpot(radius);
        existing.x = pos.x;
        existing.y = pos.y;
        existing.homeX = pos.x;
        existing.homeY = pos.y;
      }
    } else {
      // Create new bubble
      const pos = findEmptySpot(radius);
      const tag = (doubt.tags && doubt.tags[0]) ? doubt.tags[0] : (doubt.category === 'academic' ? 'Academic' : 'Other');
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
        tag,
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

// ── Tooltip ──

function createTooltip() {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'bubble-tooltip';
  tooltipEl.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: rgba(10, 16, 26, 0.95);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 8px;
    padding: 8px 12px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    color: #c8d6e5;
    line-height: 1.5;
    max-width: 220px;
    opacity: 0;
    transition: opacity 0.15s ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    display: none;
  `;
  document.body.appendChild(tooltipEl);
}

function showTooltip(bubble, clientX, clientY) {
  if (!tooltipEl) return;

  const matchPct = Math.round(bubble.match * 100);
  const urgencyPct = bubble.urgency;

  tooltipEl.innerHTML = `
    <div style="font-weight:600; margin-bottom:4px; color:#60a5fa;">${escapeHtml(bubble.tag)}</div>
    <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">
      <span style="opacity:0.6;">Urgency</span>
      <span style="font-weight:600; color:${urgencyPct > 70 ? '#f87171' : urgencyPct > 40 ? '#fbbf24' : '#34d399'}">${urgencyPct}%</span>
    </div>
    <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">
      <span style="opacity:0.6;">Match</span>
      <span style="font-weight:600; color:${matchPct > 60 ? '#60a5fa' : matchPct > 30 ? '#93c5fd' : '#8893a4'}">${matchPct}%</span>
    </div>
    <div style="opacity:0.5; font-size:0.6rem; margin-top:4px; border-top:1px solid rgba(255,255,255,0.06); padding-top:4px;">${escapeHtml(truncate(bubble.doubt.description, 60))}</div>
  `;

  tooltipEl.style.display = 'block';
  tooltipEl.style.opacity = '1';

  // Position tooltip near cursor, but keep within viewport
  const tipW = tooltipEl.offsetWidth;
  const tipH = tooltipEl.offsetHeight;
  let left = clientX + 14;
  let top = clientY - 10;

  if (left + tipW > window.innerWidth - 8) left = clientX - tipW - 14;
  if (top + tipH > window.innerHeight - 8) top = clientY - tipH - 10;
  if (top < 8) top = 8;

  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.style.opacity = '0';
  setTimeout(() => { if (tooltipEl) tooltipEl.style.display = 'none'; }, 150);
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

  // Check for hovered bubble
  let found = null;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const dist = Math.sqrt((mouseX - b.x) ** 2 + (mouseY - b.y) ** 2);
    if (dist < b.radius) {
      found = b;
      break;
    }
  }

  if (found !== hoveredBubble) {
    hoveredBubble = found;
    canvas.style.cursor = found ? 'pointer' : 'default';

    if (found) {
      showTooltip(found, e.clientX, e.clientY);
    } else {
      hideTooltip();
    }
  } else if (found) {
    // Update tooltip position as cursor moves
    showTooltip(found, e.clientX, e.clientY);
  }
}

function handleMouseLeave() {
  mouseOnScreen = false;
  hoveredBubble = null;
  canvas.style.cursor = 'default';
  hideTooltip();
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
    hideTooltip();
    if (onBubbleClick) onBubbleClick(clicked.doubtId);
  } else {
    selectedBubble = null;
  }
}

function urgencyToRadius(urgency) {
  // Map 0..100 urgency to MIN_RADIUS..MAX_RADIUS
  return MIN_RADIUS + (urgency / 100) * (MAX_RADIUS - MIN_RADIUS);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getControlsHeight() {
  // Measure the pool-controls element to find where bubbles should start
  const controls = canvas ? canvas.closest('.panel--pool')?.querySelector('.pool-controls') : null;
  return controls ? controls.getBoundingClientRect().height : 190;
}

function findEmptySpot(radius) {
  if (!canvas) return { x: 100, y: 100 };
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const controlsH = getControlsHeight();

  // Only spawn bubbles below the controls area
  const minY = controlsH + BUBBLE_PADDING + radius;
  const maxY = h - radius - BUBBLE_PADDING;
  const minX = radius + BUBBLE_PADDING;
  const maxX = w - radius - BUBBLE_PADDING;

  if (maxY <= minY || maxX <= minX) {
    // Not enough space — fallback to center
    return { x: w / 2, y: (minY + maxY) / 2 };
  }

  // Try random positions until we find one without overlap
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);

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

  // Fallback: place it somewhere in the allowed area
  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY),
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
  const canvasW = canvas.getBoundingClientRect().width;
  const canvasH = canvas.getBoundingClientRect().height;

  // 1. Organic drift — each bubble has its own wave pattern
  bubbles.forEach((b) => {
    b.vx += Math.sin(t * 0.4 + b.phase) * DRIFT_SPEED;
    b.vy += Math.cos(t * 0.3 + b.phase * 1.3) * DRIFT_SPEED;
  });

  // 2. Bubble-to-bubble repulsion (prevent overlap)
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i];
      const b2 = bubbles[j];
      const dx = b2.x - a.x;
      const dy = b2.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b2.radius + BUBBLE_PADDING;

      if (dist < minDist && dist > 0) {
        // Push apart — force stronger the closer they are
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = overlap * 0.03 * BUBBLE_REPEL_STRENGTH;
        a.vx -= nx * push;
        a.vy -= ny * push;
        b2.vx += nx * push;
        b2.vy += ny * push;
      }
    }
  }

  // 3. Damping + apply velocity + keep in bounds
  bubbles.forEach((b) => {
    b.vx *= BOUNCE_DAMPING;
    b.vy *= BOUNCE_DAMPING;
    b.x += b.vx;
    b.y += b.vy;

    // Soft boundary bounce (top boundary below controls)
    const ctrlH = getControlsHeight();
    if (b.x < b.radius) { b.x = b.radius; b.vx = Math.abs(b.vx) * 0.5; }
    if (b.x > canvasW - b.radius) { b.x = canvasW - b.radius; b.vx = -Math.abs(b.vx) * 0.5; }
    if (b.y < ctrlH + b.radius) { b.y = ctrlH + b.radius; b.vy = Math.abs(b.vy) * 0.5; }
    if (b.y > canvasH - b.radius) { b.y = canvasH - b.radius; b.vy = -Math.abs(b.vy) * 0.5; }
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
    const { x, y, radius, colors, label, status, urgency, match, tag } = b;
    const isSelected = selectedBubble && selectedBubble.doubtId === b.doubtId;
    const isHovered = hoveredBubble && hoveredBubble.doubtId === b.doubtId;

    ctx.save();

    // Spawn animation
    const age = (Date.now() - b.spawnTime) / 1000;
    const spawnScale = Math.min(1, age / 0.5);
    const easedScale = 1 - Math.pow(1 - spawnScale, 3);

    // Hover scale
    const hoverScale = isHovered ? 1.08 : 1;
    const totalScale = easedScale * hoverScale;

    ctx.translate(x, y);
    ctx.scale(totalScale, totalScale);
    ctx.translate(-x, -y);

    // Glow (brighter for higher match)
    const glowR = radius * 2.2;
    const glowAlpha = 0.04 + colors.brightness * 0.08;
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowR);
    glowGrad.addColorStop(0, `rgba(${colors.glow.join(',')}, ${glowAlpha})`);
    glowGrad.addColorStop(0.5, `rgba(${colors.glow.join(',')}, ${glowAlpha * 0.3})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Base sphere — brightness scales with match
    const shimmer = Math.sin(t * 0.4 + b.phase) * 0.1;
    const gx = x + shimmer * radius * 0.2;
    const gy = y - radius * 0.1;
    const alphaBase = 0.2 + colors.brightness * 0.45;
    const alphaMid = 0.12 + colors.brightness * 0.23;
    const alphaEdge = 0.03 + colors.brightness * 0.05;
    const baseGrad = ctx.createRadialGradient(gx, gy, 0, x, y, radius);
    baseGrad.addColorStop(0, `rgba(${colors.base.join(',')}, ${alphaBase})`);
    baseGrad.addColorStop(0.5, `rgba(${colors.base.join(',')}, ${alphaMid})`);
    baseGrad.addColorStop(1, `rgba(${colors.base.join(',')}, ${alphaEdge})`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // Border — brighter for higher match
    const borderAlpha = 0.1 + colors.brightness * 0.2;
    ctx.strokeStyle = isSelected
      ? `rgba(${colors.glow.join(',')}, 0.6)`
      : isHovered
        ? `rgba(${colors.glow.join(',')}, ${borderAlpha + 0.15})`
        : `rgba(${colors.glow.join(',')}, ${borderAlpha})`;
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.5 : 1;
    ctx.stroke();

    // NO specular highlight — removed per request

    // Tag label (small, at top)
    if (radius > 26) {
      ctx.font = `600 ${Math.max(7, radius * 0.16)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${colors.glow.join(',')}, ${0.4 + colors.brightness * 0.4})`;
      ctx.fillText(tag.toUpperCase(), x, y - radius * 0.4, radius * 1.4);
    }

    // Main label text
    if (radius > 28) {
      ctx.font = `500 ${Math.max(9, radius * 0.19)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.text;
      ctx.fillText(label, x, y + radius * 0.05, radius * 1.6);
    }

    // Match % badge (bottom)
    if (radius > 30) {
      const matchPct = Math.round(match * 100);
      ctx.font = `700 ${Math.max(8, radius * 0.17)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${colors.glow.join(',')}, ${0.3 + colors.brightness * 0.4})`;
      ctx.fillText(`${matchPct}%`, x, y + radius * 0.55, radius);
    }

    // Urgency indicator (small dot at top) for high urgency
    if (urgency > 70) {
      ctx.beginPath();
      ctx.arc(x, y - radius + 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f87171';
      ctx.fill();
      // Outer glow ring
      ctx.beginPath();
      ctx.arc(x, y - radius + 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 113, 113, 0.15)';
      ctx.fill();
    }

    // Status ring for claimed
    if (status === 'claimed') {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}
