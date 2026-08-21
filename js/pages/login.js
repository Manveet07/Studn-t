/* ============================================================
   login.js — Login Page Controller (V2)
   Username/email + password login, past profiles quick-login,
   shooting star background.
   Dependencies: store.js, loading.js
   ============================================================ */

import * as store from '../store.js';
import { showLoadingScreen } from '../loading.js';

const loginForm = document.getElementById('login-form');
const identifierInput = document.getElementById('login-identifier');
const passwordInput = document.getElementById('login-password');
const pwToggle = document.getElementById('login-pw-toggle');
const errorsEl = document.getElementById('login-errors');
const pastProfilesSection = document.getElementById('past-profiles-section');
const pastProfilesList = document.getElementById('past-profiles-list');

// ═══════════════════════════════════════════════════════════════
// SHOOTING STAR BACKGROUND
// ═══════════════════════════════════════════════════════════════

function initAuthBackground() {
  const canvas = document.getElementById('auth-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    });
  }

  const shootingStars = [];
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * w * 0.8, y: Math.random() * h * 0.3,
      length: 60 + Math.random() * 80, speed: 3 + Math.random() * 4,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      life: 1, decay: 0.015 + Math.random() * 0.01,
    });
  }

  const glitters = [];
  for (let i = 0; i < 25; i++) {
    glitters.push({
      x: Math.random() * w, y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.8,
    });
  }

  let frame, spawnTimer = 0;

  function animate(time) {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#060e1f');
    bgGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    stars.forEach((s) => {
      const alpha = 0.2 + Math.sin(t * s.speed + s.phase) * 0.3 + 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    });

    spawnTimer += 16;
    if (spawnTimer > 600 + Math.random() * 400) { spawnShootingStar(); spawnTimer = 0; }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.life -= ss.decay;
      if (ss.life <= 0) { shootingStars.splice(i, 1); continue; }

      const endX = ss.x - Math.cos(ss.angle) * ss.length;
      const endY = ss.y - Math.sin(ss.angle) * ss.length;
      const grad = ctx.createLinearGradient(ss.x, ss.y, endX, endY);
      grad.addColorStop(0, `rgba(180, 220, 255, ${ss.life * 0.8})`);
      grad.addColorStop(0.3, `rgba(100, 170, 240, ${ss.life * 0.4})`);
      grad.addColorStop(1, `rgba(37, 99, 160, 0)`);
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${ss.life})`;
      ctx.fill();
    }

    glitters.forEach((g) => {
      const alpha = 0.3 + Math.sin(t * g.speed * 3 + g.phase) * 0.4 + 0.3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 180, 255, ${Math.max(0, alpha * 0.5)})`;
      ctx.fill();
    });

    frame = requestAnimationFrame(animate);
  }

  frame = requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD TOGGLE
// ═══════════════════════════════════════════════════════════════

function initPasswordToggle() {
  pwToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
  });
}

// ═══════════════════════════════════════════════════════════════
// LOGIN HANDLER
// ═══════════════════════════════════════════════════════════════

function handleLogin(e) {
  e.preventDefault();
  errorsEl.innerHTML = '';

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  if (!identifier) {
    errorsEl.innerHTML = '<p class="pd-error">Please enter your username or email.</p>';
    return;
  }
  if (!password) {
    errorsEl.innerHTML = '<p class="pd-error">Please enter your password.</p>';
    return;
  }

  const result = store.loginUser(identifier, password);
  if (!result.success) {
    errorsEl.innerHTML = `<p class="pd-error">${result.error}</p>`;
    return;
  }

  showLoadingScreen(result.user.name, 'dashboard.html', 2200);
}

// ═══════════════════════════════════════════════════════════════
// PAST PROFILES
// ═══════════════════════════════════════════════════════════════

function renderPastProfiles() {
  const profiles = store.getPastProfiles();
  if (profiles.length === 0) {
    pastProfilesSection.style.display = 'none';
    return;
  }

  pastProfilesSection.style.display = 'block';
  pastProfilesList.innerHTML = profiles.map((p) => `
    <button class="auth-past-chip" data-username="${p.username}">
      <span class="auth-past-chip__dot"></span>
      @${p.username}
    </button>
  `).join('');

  pastProfilesList.querySelectorAll('.auth-past-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      identifierInput.value = chip.dataset.username;
      passwordInput.focus();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  initAuthBackground();
  initPasswordToggle();
  renderPastProfiles();

  loginForm.addEventListener('submit', handleLogin);

  // Back button
  const backBtn = document.getElementById('auth-back');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
