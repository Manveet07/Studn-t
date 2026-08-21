/* ============================================================
   signup.js — Signup Page Controller
   Multi-step animated questionnaire with step counter,
   staggered field entrances, and smooth transitions.
   Includes shooting star background.
   Dependencies: store.js, models.js, categories.js,
                 ui/animatedCheckbox.js, loading.js
   ============================================================ */

import * as store from '../store.js';
import { createUser, validateUser } from '../models.js';
import { ACADEMIC_SKILLS, NONACADEMIC_CATEGORIES } from '../categories.js';
import { initAnimatedCheckboxes, createCheckbox, getCheckedValues } from '../ui/animatedCheckbox.js';
import { showLoadingScreen } from '../loading.js';

// ── State ──
let currentStep = 1;
const totalSteps = 6;
let selectedYear = '';
let nonAcademicEnabled = false;

// ── DOM Refs ──
const steps = document.querySelectorAll('.auth-step');
const progressSteps = document.querySelectorAll('.auth-progress__step');
const prevBtn = document.getElementById('su-prev');
const nextBtn = document.getElementById('su-next');
const signupNav = document.getElementById('signup-nav');
const errorsEl = document.getElementById('signup-errors');
const stepCounter = document.getElementById('signup-step-counter');

// ── Step Labels ──
const STEP_LABELS = {
  1: 'Basic Info',
  2: 'Password',
  3: 'University & Year',
  4: 'Branch & About',
  5: 'Academic Skills',
  6: 'Non-Academic',
};

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
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.3,
      length: 60 + Math.random() * 80,
      speed: 3 + Math.random() * 4,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
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

  let frame;
  let spawnTimer = 0;

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
    if (spawnTimer > 600 + Math.random() * 400) {
      spawnShootingStar();
      spawnTimer = 0;
    }

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

// ── Populate Checkboxes ──
function initCheckboxes() {
  const academicGrid = document.getElementById('su-academic-skills');
  const nonacademicGrid = document.getElementById('su-nonacademic-skills');

  ACADEMIC_SKILLS.forEach((skill) => {
    academicGrid.appendChild(createCheckbox(skill, skill, 'academic'));
  });

  NONACADEMIC_CATEGORIES.forEach((cat) => {
    nonacademicGrid.appendChild(createCheckbox(cat, cat, 'nonacademic'));
  });
}

// ── Year Pill Selection ──
function initYearPills() {
  const pills = document.querySelectorAll('.pd-year-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('pd-year-pill--active'));
      pill.classList.add('pd-year-pill--active');
      selectedYear = pill.dataset.year;
    });
  });
}

// ── Non-Academic Toggle ──
function initOptinToggle() {
  const toggle = document.getElementById('su-toggle');
  const optin = document.getElementById('su-optin');
  const section = document.getElementById('su-nonacademic-section');

  const handleToggle = () => {
    nonAcademicEnabled = !nonAcademicEnabled;
    if (nonAcademicEnabled) {
      toggle.classList.add('pd-toggle--active');
      section.style.display = 'block';
      section.style.animation = 'step-in 0.4s var(--ease-standard) both';
    } else {
      toggle.classList.remove('pd-toggle--active');
      section.style.display = 'none';
    }
  };

  toggle.addEventListener('click', handleToggle);
  optin.addEventListener('click', (e) => {
    if (e.target === toggle || toggle.contains(e.target)) return;
    handleToggle();
  });
}

// ── Step Navigation ──
function goToStep(step) {
  currentStep = step;

  steps.forEach((s) => {
    s.classList.remove('auth-step--active');
    if (parseInt(s.dataset.step) === step) {
      void s.offsetWidth;
      s.classList.add('auth-step--active');
    }
  });

  progressSteps.forEach((ps) => {
    const psStep = parseInt(ps.dataset.step);
    ps.classList.remove('auth-progress__step--active', 'auth-progress__step--done');
    if (psStep === step) {
      ps.classList.add('auth-progress__step--active');
    } else if (psStep < step) {
      ps.classList.add('auth-progress__step--done');
    }
  });

  if (stepCounter) {
    stepCounter.textContent = `Step ${step} of ${totalSteps} — ${STEP_LABELS[step] || ''}`;
  }

  prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

  if (step === totalSteps) {
    nextBtn.textContent = 'Create Account ✓';
    nextBtn.classList.add('pd-btn--next-pulse');
  } else {
    nextBtn.innerHTML = 'Next →';
    nextBtn.classList.add('pd-btn--next-pulse');
  }

  errorsEl.innerHTML = '';

  if (step === 5 || step === 6) {
    initAnimatedCheckboxes();
  }
}

// ── Validation per Step ──
function validateStep(step) {
  const errors = [];

  if (step === 1) {
    const name = document.getElementById('su-name').value;
    const username = document.getElementById('su-username').value;
    const email = document.getElementById('su-email').value;

    if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
    if (!username || username.trim().length < 3) errors.push('Username must be at least 3 characters.');
    if (username && store.usernameExists(username)) errors.push('This username is already taken.');
    if (!email || email.trim().length < 5) errors.push('Please enter a valid email address.');
    if (email && !email.includes('@')) errors.push('Email must contain @');
  }

  if (step === 2) {
    const password = document.getElementById('su-password').value;
    const confirmPassword = document.getElementById('su-confirm-password').value;
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
    if (password !== confirmPassword) errors.push('Passwords do not match.');
  }

  if (step === 3) {
    const university = document.getElementById('su-university').value;
    const campus = document.getElementById('su-campus').value;
    if (!university || university.trim().length < 2) errors.push('University name is required.');
    if (!campus || campus.trim().length < 2) errors.push('Campus/location is required.');
    if (!selectedYear) errors.push('Please select your year.');
  }

  if (step === 4) {
    const branch = document.getElementById('su-branch').value;
    if (!branch || branch.trim().length < 1) errors.push('Branch is required.');
  }

  if (step === 5) {
    const academicSkills = getCheckedValues(document.getElementById('su-academic-skills'));
    if (academicSkills.length === 0) errors.push('Select at least one academic skill.');
  }

  return errors;
}

function showErrors(errors) {
  errorsEl.innerHTML = errors.map((e) =>
    `<p class="pd-error">${e}</p>`
  ).join('');
}

// ── Create Account ──
function createAccount() {
  const name = document.getElementById('su-name').value;
  const username = document.getElementById('su-username').value;
  const email = document.getElementById('su-email').value;
  const university = document.getElementById('su-university').value;
  const campus = document.getElementById('su-campus').value;
  const branch = document.getElementById('su-branch').value;
  const bio = document.getElementById('su-bio').value;
  const academicSkills = getCheckedValues(document.getElementById('su-academic-skills'));
  const nonAcademicSkills = nonAcademicEnabled
    ? getCheckedValues(document.getElementById('su-nonacademic-skills'))
    : [];

  const password = document.getElementById('su-password').value;

  const user = createUser({
    name,
    username,
    email,
    password,
    university,
    campus,
    year: selectedYear,
    branch,
    bio,
    academicSkills,
    nonAcademicSkills,
  });

  const validation = validateUser(user);
  if (!validation.valid) {
    showErrors(validation.errors);
    return false;
  }

  store.addUser(user);
  store.setCurrentUserId(user.id);

  return true;
}

// ── Next Button Handler ──
function handleNext() {
  const errors = validateStep(currentStep);
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  if (currentStep < totalSteps) {
    goToStep(currentStep + 1);
  } else {
    const success = createAccount();
    if (success) {
      steps.forEach((s) => s.classList.remove('auth-step--active'));
      const successStep = document.querySelector('[data-step="success"]');
      if (successStep) {
        void successStep.offsetWidth;
        successStep.classList.add('auth-step--active');
      }
      signupNav.style.display = 'none';
      progressSteps.forEach((ps) => ps.classList.add('auth-progress__step--done'));
      if (stepCounter) stepCounter.textContent = 'All done!';
    }
  }
}

// ── Go to Dashboard ──
function initDashboardRedirect() {
  const btn = document.getElementById('su-go-dashboard');
  if (btn) {
    btn.addEventListener('click', () => {
      const user = store.getCurrentUser();
      const name = user ? user.name : 'there';
      showLoadingScreen(name, 'dashboard.html', 2200);
    });
  }
}

// ── Enter key to advance ──
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && currentStep <= totalSteps) {
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
      e.preventDefault();
      handleNext();
    }
  });
}

// ── Init ──
function initPasswordToggles() {
  const suPwToggle = document.getElementById('su-pw-toggle');
  const suCpwToggle = document.getElementById('su-cpw-toggle');
  const pwInput = document.getElementById('su-password');
  const cpwInput = document.getElementById('su-confirm-password');

  if (suPwToggle && pwInput) {
    suPwToggle.addEventListener('click', () => {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    });
  }
  if (suCpwToggle && cpwInput) {
    suCpwToggle.addEventListener('click', () => {
      cpwInput.type = cpwInput.type === 'password' ? 'text' : 'password';
    });
  }
}

function initBackButton() {
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

function init() {
  initAuthBackground();

  initCheckboxes();
  initYearPills();
  initOptinToggle();
  initAnimatedCheckboxes();
  initDashboardRedirect();
  initKeyboardNav();
  initPasswordToggles();
  initBackButton();

  nextBtn.addEventListener('click', handleNext);
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  goToStep(1);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
