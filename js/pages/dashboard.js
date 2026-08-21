/* ============================================================
   dashboard.js — Dashboard Page Controller (V2)
   3-column layout: sidebar, my doubts panel, doubt pool panel.
   Solid lines & boxes, no gradients, shooting star bg.
   Dependencies: store.js, models.js, categories.js,
                 algorithms/matchScore.js, algorithms/priorityScore.js
   ============================================================ */

import * as store from '../store.js';
import { createDoubt, validateDoubt } from '../models.js';
import { ACADEMIC_SKILLS, NONACADEMIC_CATEGORIES } from '../categories.js';
import { matchScore } from '../algorithms/matchScore.js';
import { priorityScore } from '../algorithms/priorityScore.js';
import { initBubblePool, updateBubbles } from '../bubbles.js';

// ── Auth Guard ──
const currentUser = store.getCurrentUser();

// ── DOM Refs ──
const logoutBtn = document.getElementById('sidebar-logout');
const postDoubtBtn = document.getElementById('btn-post-doubt');

// Doubt panel
const myDoubtsList = document.getElementById('my-doubts-list');
const myDoubtsEmpty = document.getElementById('my-doubts-empty');
const myDoubtsTabs = document.querySelectorAll('.panel__tab[data-tab]');

// Pool panel
const poolList = document.getElementById('pool-list');
const poolEmpty = document.getElementById('pool-empty');
const poolTabs = document.querySelectorAll('.pool-tab[data-pool]');

// Modal
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSubmit = document.getElementById('modal-submit');
const modalTags = document.getElementById('modal-tags');
const modalErrors = document.getElementById('modal-errors');
const modalDescription = document.getElementById('modal-description');
const modalCourse = document.getElementById('modal-course');
const modalUrgency = document.getElementById('modal-urgency');
const modalUrgencyValue = document.getElementById('modal-urgency-value');
const categoryTabs = document.querySelectorAll('.modal__category-tab');

// Detail panel
const detailPanel = document.getElementById('bubble-detail');
const detailClose = document.getElementById('detail-close');
const detailCategory = document.getElementById('detail-category');
const detailTitle = document.getElementById('detail-title');
const detailUrgency = document.getElementById('detail-urgency');
const detailTime = document.getElementById('detail-time');
const detailTags = document.getElementById('detail-tags');
const detailClaim = document.getElementById('detail-claim');
const detailDismiss = document.getElementById('detail-dismiss');

let selectedCategory = 'academic';
let selectedTags = [];
let activeTab = 'active';
let activePoolFilter = 'all';

// ═══════════════════════════════════════════════════════════════
// STAR BACKGROUND (subtle)
// ═══════════════════════════════════════════════════════════════

function initDashboardBackground() {
  const canvas = document.getElementById('dashboard-bg-canvas');
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

  // Fewer, subtler stars
  const stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.8,
    });
  }

  const glitters = [];
  for (let i = 0; i < 10; i++) {
    glitters.push({
      x: Math.random() * w, y: Math.random() * h,
      size: 0.5 + Math.random() * 1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.4,
    });
  }

  // Occasional shooting stars
  const shootingStars = [];
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * w * 0.7,
      y: Math.random() * h * 0.4,
      length: 40 + Math.random() * 60,
      speed: 2 + Math.random() * 3,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.02 + Math.random() * 0.015,
    });
  }

  let spawnTimer = 0;

  function animate(time) {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    // Very subtle background
    const bgGrad = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#070e1c');
    bgGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Very faint ambient glow
    const ambGrad = ctx.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, w * 0.3);
    ambGrad.addColorStop(0, 'rgba(37, 99, 160, 0.03)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    stars.forEach((s) => {
      const alpha = 0.1 + Math.sin(t * s.speed + s.phase) * 0.15 + 0.15;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 190, 240, ${Math.max(0, alpha)})`;
      ctx.fill();
    });

    // Occasional shooting stars
    spawnTimer += 16;
    if (spawnTimer > 2000 + Math.random() * 3000) {
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
      grad.addColorStop(0, `rgba(180, 220, 255, ${ss.life * 0.6})`);
      grad.addColorStop(0.4, `rgba(100, 170, 240, ${ss.life * 0.3})`);
      grad.addColorStop(1, `rgba(37, 99, 160, 0)`);
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${ss.life * 0.8})`;
      ctx.fill();
    }

    // Glitters
    glitters.forEach((g) => {
      const alpha = 0.1 + Math.sin(t * g.speed * 2 + g.phase) * 0.12;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 170, 240, ${Math.max(0, alpha * 0.4)})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════════
// MY DOUBTS LIST
// ═══════════════════════════════════════════════════════════════

function renderMyDoubts() {
  if (!currentUser) return;

  const doubts = store.getDoubts();
  const filtered = doubts.filter((d) => {
    if (activeTab === 'active') {
      return (d.status === 'open' || d.status === 'claimed') && d.authorId === currentUser.id;
    } else {
      return d.status === 'resolved' && d.authorId === currentUser.id;
    }
  });

  if (filtered.length === 0) {
    myDoubtsList.innerHTML = '';
    myDoubtsEmpty.style.display = '';
    return;
  }

  myDoubtsEmpty.style.display = 'none';
  myDoubtsList.innerHTML = filtered.map((d) => {
    const timeAgo = getTimeAgo(d.createdAt);
    const firstTag = (d.tags && d.tags[0]) ? d.tags[0] : (d.category === 'academic' ? 'ACADEMIC' : 'OTHER');
    const tagClass = d.category === 'academic' ? 'doubt-card__tag--academic' : 'doubt-card__tag--nonacademic';
    const isResolved = d.status === 'resolved';
    const dotClass = isResolved ? 'doubt-card__dot--resolved' : 'doubt-card__dot--active';
    const statusClass = isResolved ? 'doubt-card__status--resolved' : 'doubt-card__status--active';
    const statusText = isResolved ? 'RESOLVED' : 'ACTIVE';

    return `
      <div class="doubt-card" data-doubt-id="${d.id}">
        <div class="doubt-card__top">
          <span class="doubt-card__tag ${tagClass}">${escapeHtml(firstTag.toUpperCase())}</span>
          <span class="doubt-card__status ${statusClass}">
            <span class="doubt-card__dot ${dotClass}"></span>
            ${statusText}
          </span>
        </div>
        <div class="doubt-card__title">${escapeHtml(d.description)}</div>
        <div class="doubt-card__bottom">
          <span class="doubt-card__time">${timeAgo}</span>
          <svg class="doubt-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `;
  }).join('');

  myDoubtsList.querySelectorAll('.doubt-card').forEach((el) => {
    el.addEventListener('click', () => showDoubtDetail(el.dataset.doubtId));
  });
}

function initMyDoubtsTabs() {
  myDoubtsTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      myDoubtsTabs.forEach((t) => t.classList.remove('panel__tab--active'));
      tab.classList.add('panel__tab--active');
      activeTab = tab.dataset.tab;
      renderMyDoubts();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// DOUBT POOL (right panel)
// ═══════════════════════════════════════════════════════════════

function renderPool() {
  if (!currentUser) return;

  const doubts = store.getDoubts();

  // Filter open doubts not by current user
  let poolDoubts = doubts.filter(
    (d) => (d.status === 'open' || d.status === 'claimed') && d.authorId !== currentUser.id
  );

  // Apply filter
  if (activePoolFilter === 'eligible') {
    poolDoubts = poolDoubts.filter((d) => {
      const match = matchScore(currentUser, d);
      return match > 0.2;
    });
  } else if (activePoolFilter === 'campus') {
    poolDoubts = poolDoubts.filter((d) => {
      const author = store.getUserById(d.authorId);
      return author && author.university === currentUser.university;
    });
  }

  // Sort by match score
  const scored = poolDoubts.map((d) => {
    const match = matchScore(currentUser, d);
    return { doubt: d, match };
  }).sort((a, b) => b.match - a.match);

  if (scored.length === 0) {
    poolList.innerHTML = '';
    poolEmpty.style.display = '';
    return;
  }

  poolEmpty.style.display = 'none';
  // Track previous IDs for pop animation
  const prevIds = new Set();
  poolList.querySelectorAll('.pool-item').forEach((el) => prevIds.add(el.dataset.doubtId));

  poolList.innerHTML = scored.map((item) => {
    const { doubt, match } = item;
    const timeAgo = getTimeAgo(doubt.createdAt);
    const matchPercent = Math.round(match * 100);
    const firstTag = (doubt.tags && doubt.tags[0]) ? doubt.tags[0] : (doubt.category === 'academic' ? 'ACADEMIC' : 'OTHER');

    return `
      <div class="pool-item" data-doubt-id="${doubt.id}">
        <div class="pool-item__top">
          <span class="pool-item__match">${matchPercent}%</span>
          <span class="pool-item__title">${escapeHtml(doubt.description)}</span>
        </div>
        <div class="pool-item__bottom">
          <span class="pool-item__tag">${escapeHtml(firstTag.toUpperCase())}</span>
          <span class="pool-item__time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');

  // Wire click handlers
  poolList.querySelectorAll('.pool-item').forEach((el) => {
    el.addEventListener('click', () => showDoubtDetail(el.dataset.doubtId));
  });
}

function initPoolTabs() {
  poolTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      poolTabs.forEach((t) => t.classList.remove('pool-tab--active'));
      tab.classList.add('pool-tab--active');
      activePoolFilter = tab.dataset.pool;
      renderPool();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// DOUBT DETAIL PANEL
// ═══════════════════════════════════════════════════════════════

function showDoubtDetail(doubtId) {
  const doubt = store.getDoubtById(doubtId);
  if (!doubt) return;
  detailPanel.dataset.currentDoubtId = doubtId;

  detailCategory.textContent = doubt.category === 'academic' ? 'Academic' : 'Non-Academic';
  detailTitle.textContent = doubt.description;
  detailUrgency.textContent = `${doubt.urgency}%`;
  detailTime.textContent = getTimeAgo(doubt.createdAt);

  detailTags.innerHTML = (doubt.tags || [])
    .map((t) => `<span class="detail-panel__tag">${escapeHtml(t)}</span>`)
    .join('');

  const isAuthor = doubt.authorId === currentUser.id;
  const isClaimed = doubt.claimedBy === currentUser.id;
  const canClaim = doubt.status === 'open' && !isAuthor;

  detailClaim.style.display = canClaim ? 'block' : 'none';
  detailClaim.textContent = isClaimed ? 'You claimed this' : 'Claim Doubt';

  if (isClaimed) {
    detailClaim.disabled = true;
    detailClaim.style.opacity = '0.5';
  } else {
    detailClaim.disabled = false;
    detailClaim.style.opacity = '1';
  }

  detailPanel.style.display = 'block';
}

function hideDoubtDetail() {
  detailPanel.style.display = 'none';
}

function initDetailPanel() {
  detailClose.addEventListener('click', hideDoubtDetail);

  detailClaim.addEventListener('click', () => {
    const doubtId = detailPanel.dataset.currentDoubtId;
    if (!doubtId) return;

    store.updateDoubt(doubtId, {
      status: 'claimed',
      claimedBy: currentUser.id,
      claimedAt: Date.now(),
    });

    hideDoubtDetail();
    renderMyDoubts();
    renderPool();
    refreshBubbles();
  });

  detailDismiss.addEventListener('click', hideDoubtDetail);
}

// ═══════════════════════════════════════════════════════════════
// DOUBT CREATION MODAL
// ═══════════════════════════════════════════════════════════════

function openModal() {
  modalOverlay.style.display = 'flex';
  modalErrors.innerHTML = '';
  selectedTags = [];
  selectedCategory = 'academic';
  renderModalTags();
  updateCategoryTabs();
  modalDescription.value = '';
  modalCourse.value = '';
  modalUrgency.value = 50;
  modalUrgencyValue.textContent = '50';
}

function closeModal() {
  modalOverlay.classList.add('modal-overlay--exit');
  setTimeout(() => {
    modalOverlay.style.display = 'none';
    modalOverlay.classList.remove('modal-overlay--exit');
  }, 250);
}

function renderModalTags() {
  const tags = selectedCategory === 'academic' ? ACADEMIC_SKILLS : NONACADEMIC_CATEGORIES;
  modalTags.innerHTML = tags.map((tag) => {
    const isSelected = selectedTags.includes(tag);
    return `<button class="modal__tag ${isSelected ? 'modal__tag--selected' : ''}" data-tag="${tag}">${tag}</button>`;
  }).join('');

  modalTags.querySelectorAll('.modal__tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter((t) => t !== tag);
        btn.classList.remove('modal__tag--selected');
      } else {
        selectedTags.push(tag);
        btn.classList.add('modal__tag--selected');
      }
    });
  });
}

function updateCategoryTabs() {
  categoryTabs.forEach((tab) => {
    tab.classList.remove('modal__category-tab--active');
    if (tab.dataset.category === selectedCategory) {
      tab.classList.add('modal__category-tab--active');
    }
  });
}

function handleSubmit() {
  const description = modalDescription.value.trim();
  const courseContext = modalCourse.value.trim();
  const urgency = parseInt(modalUrgency.value, 10);

  const doubtData = {
    authorId: currentUser.id,
    category: selectedCategory,
    tags: selectedTags,
    courseContext,
    description,
    urgency,
  };

  const validation = validateDoubt(doubtData);
  if (!validation.valid) {
    modalErrors.innerHTML = validation.errors
      .map((e) => `<p class="modal__error">${e}</p>`)
      .join('');
    return;
  }

  const doubt = createDoubt(doubtData);
  store.addDoubt(doubt);

  closeModal();
  renderMyDoubts();
  renderPool();
  refreshBubbles();
}

function initModal() {
  postDoubtBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalSubmit.addEventListener('click', handleSubmit);

  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      selectedCategory = tab.dataset.category;
      selectedTags = [];
      updateCategoryTabs();
      renderModalTags();
    });
  });

  modalUrgency.addEventListener('input', () => {
    modalUrgencyValue.textContent = modalUrgency.value;
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
      closeModal();
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

function renderSidebarAvatar() {
  const avatarEl = document.getElementById('sidebar-avatar');
  const letterEl = document.getElementById('sidebar-avatar-letter');
  if (currentUser && avatarEl) {
    if (currentUser.avatar) {
      avatarEl.style.backgroundImage = `url(${currentUser.avatar})`;
      avatarEl.style.backgroundSize = 'cover';
      if (letterEl) letterEl.style.display = 'none';
    } else if (letterEl) {
      letterEl.textContent = currentUser.name.charAt(0).toUpperCase();
    }
    avatarEl.addEventListener('click', () => { window.location.href = 'profile.html'; });
  }
}

function initBubblePoolCanvas() {
  const canvasEl = document.getElementById('bubble-pool-canvas');
  if (!canvasEl) return;

  initBubblePool(canvasEl, (doubtId) => {
    showDoubtDetail(doubtId);
  });

  refreshBubbles();
}

function refreshBubbles() {
  const doubts = store.getDoubts();
  updateBubbles(doubts, currentUser, matchScore);

  const activeCount = doubts.filter((d) => d.status === 'open' || d.status === 'claimed').length;
  const emptyEl = document.getElementById('pool-empty');
  if (emptyEl) {
    emptyEl.style.display = activeCount > 0 ? 'none' : '';
  }
}

function initPoolSearch() {
  const searchInput = document.getElementById('pool-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const items = poolList.querySelectorAll('.pool-item');
    items.forEach((el) => {
      const title = el.querySelector('.pool-item__title');
      if (!title) return;
      const text = title.textContent.toLowerCase();
      el.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  });
}

function init() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Show content only after auth confirmed
  document.querySelector('.app-shell').classList.add('app-shell--ready');

  initDashboardBackground();
  renderSidebarAvatar();
  renderMyDoubts();
  renderPool();
  initMyDoubtsTabs();
  initPoolTabs();
  initPoolSearch();
  initBubblePoolCanvas();
  initModal();
  initDetailPanel();

  logoutBtn.addEventListener('click', () => {
    store.logout();
    window.location.href = 'index.html';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
