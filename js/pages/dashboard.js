/* ============================================================
   dashboard.js — Dashboard Page Controller (V2)
   3-column layout: sidebar, my doubts panel, doubt pool panel.
   Solid lines & boxes, no gradients, shooting star bg.
   Dependencies: store.js, models.js, categories.js,
                 algorithms/matchScore.js, algorithms/priorityScore.js
   ============================================================ */

import * as store from '../store.js';
import { createDoubt, validateDoubt, createReply, validateReply, createNotification } from '../models.js';
import { recordContributionEvent } from '../services/leaderboardService.js';
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

  // Show ALL active doubts in the pool (including your own)
  let poolDoubts = doubts.filter(
    (d) => d.status === 'open' || d.status === 'claimed'
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

  // Update bubbles with filtered doubts
  updateBubbles(poolDoubts, currentUser, matchScore);

  // Toggle empty state
  if (poolEmpty) {
    poolEmpty.style.display = poolDoubts.length === 0 ? '' : 'none';
  }
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

  const author = store.getUserById(doubt.authorId);
  const claimer = doubt.claimedBy ? store.getUserById(doubt.claimedBy) : null;

  detailCategory.textContent = doubt.category === 'academic' ? 'ACADEMIC' : 'NON-ACADEMIC';
  detailTitle.textContent = doubt.description;
  detailUrgency.textContent = `${doubt.urgency}%`;
  detailTime.textContent = getTimeAgo(doubt.createdAt);

  detailTags.innerHTML = (doubt.tags || [])
    .map((t) => `<span class="detail-panel__tag">${escapeHtml(t)}</span>`)
    .join('');

  // Build detail body
  const isAuthor = doubt.authorId === currentUser.id;
  const isClaimer = doubt.claimedBy === currentUser.id;
  const canClaim = doubt.status === 'open' && !isAuthor;
  const canResolve = doubt.status === 'claimed' && isClaimer;
  const canRate = doubt.status === 'resolved' && isAuthor && !doubt.ratingGiven;

  // Author info
  let authorHtml = '';
  if (author) {
    authorHtml = `
      <div class="detail-panel__person">
        <div class="detail-panel__person-avatar">${author.name.charAt(0).toUpperCase()}</div>
        <div class="detail-panel__person-info">
          <div class="detail-panel__person-name">${escapeHtml(author.name)}</div>
          <div class="detail-panel__person-sub">@${escapeHtml(author.username)} · ${author.branch || ''}</div>
        </div>
      </div>
    `;
  }

  // Claimer info
  let claimerHtml = '';
  if (claimer && (doubt.status === 'claimed' || doubt.status === 'resolved')) {
    claimerHtml = `
      <div class="detail-panel__person">
        <div class="detail-panel__person-avatar detail-panel__person-avatar--helper">${claimer.name.charAt(0).toUpperCase()}</div>
        <div class="detail-panel__person-info">
          <div class="detail-panel__person-name">${escapeHtml(claimer.name)}</div>
          <div class="detail-panel__person-sub">@${escapeHtml(claimer.username)} · ${claimer.branch || ''}</div>
        </div>
      </div>
    `;
  }

  // Status badge
  let statusBadge = '';
  if (doubt.status === 'open') {
    statusBadge = '<span class="detail-panel__badge detail-panel__badge--open">OPEN</span>';
  } else if (doubt.status === 'claimed') {
    statusBadge = '<span class="detail-panel__badge detail-panel__badge--claimed">CLAIMED</span>';
  } else if (doubt.status === 'resolved') {
    statusBadge = '<span class="detail-panel__badge detail-panel__badge--resolved">RESOLVED</span>';
  }

  // Rating display
  let ratingHtml = '';
  if (doubt.status === 'resolved' && doubt.ratingGiven) {
    const stars = Array.from({ length: 5 }, (_, i) =>
      i < doubt.ratingGiven ? '★' : '☆'
    ).join('');
    ratingHtml = `<div class="detail-panel__rating-display">Rating: <span class="detail-panel__stars">${stars}</span></div>`;
  }

  // Rating form (for author after resolve)
  let ratingFormHtml = '';
  if (canRate) {
    ratingFormHtml = `
      <div class="detail-panel__rating-form" id="rating-form">
        <div class="detail-panel__rating-label">Rate this helper:</div>
        <div class="detail-panel__rating-stars" id="rating-stars">
          <button class="rating-star" data-rating="1">★</button>
          <button class="rating-star" data-rating="2">★</button>
          <button class="rating-star" data-rating="3">★</button>
          <button class="rating-star" data-rating="4">★</button>
          <button class="rating-star" data-rating="5">★</button>
        </div>
      </div>
    `;
  }

  // Actions
  let actionsHtml = '';
  if (canClaim) {
    actionsHtml = `<button class="detail-panel__btn detail-panel__btn--claim" id="detail-claim">Claim Doubt</button>`;
  } else if (canResolve) {
    actionsHtml = `<button class="detail-panel__btn detail-panel__btn--resolve" id="detail-resolve">Mark as Resolved</button>`;
  }
  actionsHtml += `<button class="detail-panel__btn detail-panel__btn--dismiss" id="detail-dismiss">Close</button>`;

  // Assemble detail body
  const bodyEl = detailPanel.querySelector('.detail-panel__inner');
  const existingBody = bodyEl.querySelector('.detail-panel__body');
  if (existingBody) existingBody.remove();

  const body = document.createElement('div');
  body.className = 'detail-panel__body';
  body.innerHTML = `
    <div class="detail-panel__section">
      <div class="detail-panel__section-label">STATUS</div>
      ${statusBadge}
    </div>
    <div class="detail-panel__section">
      <div class="detail-panel__section-label">POSTED BY</div>
      ${authorHtml}
    </div>
    ${claimerHtml ? `<div class="detail-panel__section"><div class="detail-panel__section-label">CLAIMED BY</div>${claimerHtml}</div>` : ''}
    ${ratingHtml ? `<div class="detail-panel__section">${ratingHtml}</div>` : ''}
    ${ratingFormHtml ? `<div class="detail-panel__section">${ratingFormHtml}</div>` : ''}
    <div class="detail-panel__actions">
      ${actionsHtml}
    </div>
    <div class="detail-panel__section">
      <div class="detail-panel__section-label">REPLIES</div>
      <div class="reply-thread" id="reply-thread"></div>
      <div class="reply-input-wrap">
        <textarea class="reply-input" id="reply-input" placeholder="Write a reply..." rows="2"></textarea>
        <button class="reply-submit" id="reply-submit">Reply</button>
      </div>
    </div>
  `;

  // Insert before existing actions div
  const existingActions = bodyEl.querySelector('.detail-panel__actions');
  if (existingActions) existingActions.remove();
  bodyEl.appendChild(body);

  // Wire new action buttons
  const newClaimBtn = body.querySelector('#detail-claim');
  const newResolveBtn = body.querySelector('#detail-resolve');
  const newDismissBtn = body.querySelector('#detail-dismiss');
  const ratingStars = body.querySelector('#rating-stars');

  if (newClaimBtn) {
    newClaimBtn.addEventListener('click', () => handleClaim(doubtId));
  }
  if (newResolveBtn) {
    newResolveBtn.addEventListener('click', () => handleResolve(doubtId));
  }
  if (newDismissBtn) {
    newDismissBtn.addEventListener('click', hideDoubtDetail);
  }
  if (ratingStars) {
    ratingStars.querySelectorAll('.rating-star').forEach((star) => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating, 10);
        handleRate(doubtId, rating);
      });
    });
  }

  // Wire reply input
  const replyInput = body.querySelector('#reply-input');
  const replySubmit = body.querySelector('#reply-submit');
  const replyThread = body.querySelector('#reply-thread');

  if (replySubmit && replyInput && replyThread) {
    replySubmit.addEventListener('click', () => handlePostReply(doubtId, replyInput, replyThread));
    replyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handlePostReply(doubtId, replyInput, replyThread);
      }
    });
    renderReplies(doubtId, replyThread);
  }

  detailPanel.classList.add('detail-panel--open');
}

function hideDoubtDetail() {
  detailPanel.classList.remove('detail-panel--open');
}

function handleClaim(doubtId) {
  store.updateDoubt(doubtId, {
    status: 'claimed',
    claimedBy: currentUser.id,
    claimedAt: Date.now(),
  });

  // Record claim contribution event (+5 points)
  recordContributionEvent({
    userId: currentUser.id,
    action: 'claim',
    doubtId,
  });

  // Notify the author
  const doubt = store.getDoubtById(doubtId);
  if (doubt) {
    const notif = createNotification({
      type: 'claim',
      fromUserId: currentUser.id,
      doubtId,
      message: `${currentUser.name} claimed your doubt: "${doubt.description.slice(0, 40)}..."`,
    });
    store.addNotification(doubt.authorId, notif);
  }

  hideDoubtDetail();
  renderMyDoubts();
  refreshBubbles();
  updateNotifBadge();
}

function handleResolve(doubtId) {
  store.updateDoubt(doubtId, {
    status: 'resolved',
    resolvedAt: Date.now(),
  });

  // Record resolve contribution event (+10 points)
  recordContributionEvent({
    userId: currentUser.id,
    action: 'resolve',
    doubtId,
  });

  // Notify the author
  const doubt = store.getDoubtById(doubtId);
  if (doubt) {
    const notif = createNotification({
      type: 'resolve',
      fromUserId: currentUser.id,
      doubtId,
      message: `${currentUser.name} resolved your doubt: "${doubt.description.slice(0, 40)}..."`,
    });
    store.addNotification(doubt.authorId, notif);
  }

  hideDoubtDetail();
  renderMyDoubts();
  refreshBubbles();
  updateNotifBadge();
}

function handleRate(doubtId, rating) {
  const doubt = store.getDoubtById(doubtId);
  if (!doubt || !doubt.claimedBy) return;

  store.updateDoubt(doubtId, {
    ratingGiven: rating,
    ratingTimestamp: Date.now(),
  });

  // Record rating contribution event for the helper
  recordContributionEvent({
    userId: doubt.claimedBy,
    action: `rate_${rating}`,
    doubtId,
    rating,
  });

  // Add rating to helper's history
  const helper = store.getUserById(doubt.claimedBy);
  if (helper) {
    const history = helper.ratingHistory || [];
    history.push({ doubtId, rating, timestamp: Date.now() });
    store.updateUser(doubt.claimedBy, { ratingHistory: history });
  }

  // Notify the helper
  const notif = createNotification({
    type: 'rate',
    fromUserId: currentUser.id,
    doubtId,
    message: `${currentUser.name} gave you ${rating}★ for helping with: "${doubt.description.slice(0, 40)}..."`,
  });
  store.addNotification(doubt.claimedBy, notif);

  hideDoubtDetail();
  renderMyDoubts();
  refreshBubbles();
  updateNotifBadge();
}

// ═══════════════════════════════════════════════════════════════
// REPLY SYSTEM
// ═══════════════════════════════════════════════════════════════

function renderReplies(doubtId, containerEl) {
  const replies = store.getRepliesByDoubt(doubtId);
  const doubt = store.getDoubtById(doubtId);
  if (!doubt || !containerEl) return;

  const isAuthor = doubt.authorId === currentUser.id;
  const isResolved = doubt.status === 'resolved';

  if (replies.length === 0) {
    containerEl.innerHTML = '<div class="reply-empty">No replies yet. Be the first to help!</div>';
    return;
  }

  containerEl.innerHTML = replies.map((reply) => {
    const author = store.getUserById(reply.authorId);
    if (!author) return '';

    const likeCount = (reply.likes || []).length;
    const dislikeCount = (reply.dislikes || []).length;
    const didLike = (reply.likes || []).includes(currentUser.id);
    const didDislike = (reply.dislikes || []).includes(currentUser.id);
    const bestClass = reply.isBestAnswer ? ' reply-card--best' : '';
    const bestBadge = reply.isBestAnswer ? '<span class="reply-card__best-badge">✓ BEST ANSWER</span>' : '';
    const canMarkBest = isAuthor && !isResolved && !reply.isBestAnswer && reply.authorId !== currentUser.id;
    const timeAgo = getTimeAgo(reply.createdAt);

    return `
      <div class="reply-card${bestClass}" data-reply-id="${reply.id}">
        <div class="reply-card__header">
          <div class="reply-card__author">
            <div class="reply-card__avatar">${author.name.charAt(0).toUpperCase()}</div>
            <div class="reply-card__author-info">
              <span class="reply-card__name">${escapeHtml(author.name)}</span>
              <span class="reply-card__username">@${escapeHtml(author.username)}</span>
            </div>
          </div>
          <div class="reply-card__meta">
            ${bestBadge}
            <span class="reply-card__time">${timeAgo}</span>
          </div>
        </div>
        <div class="reply-card__text">${escapeHtml(reply.text)}</div>
        <div class="reply-card__footer">
          <div class="reply-card__votes">
            <button class="reply-card__vote-btn${didLike ? ' reply-card__vote-btn--active' : ''}" data-action="like" data-reply-id="${reply.id}" title="Helpful">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>${likeCount}</span>
            </button>
            <button class="reply-card__vote-btn${didDislike ? ' reply-card__vote-btn--active-down' : ''}" data-action="dislike" data-reply-id="${reply.id}" title="Not helpful">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
              <span>${dislikeCount}</span>
            </button>
          </div>
          ${canMarkBest ? `<button class="reply-card__best-btn" data-action="best" data-reply-id="${reply.id}">Mark as Best Answer</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Wire vote buttons
  containerEl.querySelectorAll('.reply-card__vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const replyId = btn.dataset.replyId;
      const action = btn.dataset.action;
      handleReplyVote(replyId, action, doubtId, containerEl);
    });
  });

  // Wire best answer buttons
  containerEl.querySelectorAll('.reply-card__best-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const replyId = btn.dataset.replyId;
      handleMarkBestAnswer(replyId, doubtId, containerEl);
    });
  });
}

function handleReplyVote(replyId, action, doubtId, containerEl) {
  const reply = action === 'like'
    ? store.likeReply(replyId, currentUser.id)
    : store.dislikeReply(replyId, currentUser.id);

  if (!reply) return;

  if (action === 'like') {
    if (reply.likes.includes(currentUser.id)) {
      // Just liked -> +2 points
      recordContributionEvent({
        userId: reply.authorId,
        action: 'reply_liked',
        doubtId,
        replyId,
      });

      // Notify reply author
      const doubt = store.getDoubtById(doubtId);
      const notif = createNotification({
        type: 'like',
        fromUserId: currentUser.id,
        doubtId,
        message: `${currentUser.name} liked your reply on: "${doubt ? doubt.description.slice(0, 30) : ''}..."`,
      });
      store.addNotification(reply.authorId, notif);
    } else {
      // Unliked -> -1 or undo (+2 reverted by -1 / penalty)
      recordContributionEvent({
        userId: reply.authorId,
        action: 'reply_disliked',
        doubtId,
        replyId,
      });
    }
  } else if (action === 'dislike') {
    if (reply.dislikes.includes(currentUser.id)) {
      recordContributionEvent({
        userId: reply.authorId,
        action: 'reply_disliked',
        doubtId,
        replyId,
      });
    } else {
      recordContributionEvent({
        userId: reply.authorId,
        action: 'reply_liked',
        doubtId,
        replyId,
      });
    }
  }

  updateNotifBadge();
  renderReplies(doubtId, containerEl);
}

function handleMarkBestAnswer(replyId, doubtId, containerEl) {
  store.markBestAnswer(replyId, doubtId);
  store.updateDoubt(doubtId, {
    status: 'resolved',
    resolvedAt: Date.now(),
  });

  // Record best answer event (+15 points)
  const reply = store.getReplies().find((r) => r.id === replyId);
  if (reply) {
    recordContributionEvent({
      userId: reply.authorId,
      action: 'best_answer',
      doubtId,
      replyId,
    });

    // Notify the helper
    const doubt = store.getDoubtById(doubtId);
    const notif = createNotification({
      type: 'best_answer',
      fromUserId: currentUser.id,
      doubtId,
      message: `${currentUser.name} marked your reply as the best answer on: "${doubt ? doubt.description.slice(0, 30) : ''}..."`,
    });
    store.addNotification(reply.authorId, notif);
  }

  updateNotifBadge();
  renderMyDoubts();
  refreshBubbles();
  // Re-show detail with updated status
  showDoubtDetail(doubtId);
}

function handlePostReply(doubtId, textInput, containerEl) {
  const text = textInput.value.trim();
  const validation = validateReply({ text });
  if (!validation.valid) return;

  const reply = createReply({
    authorId: currentUser.id,
    doubtId,
    text,
  });

  store.addReply(reply);
  textInput.value = '';

  // Notify the doubt author
  const doubt = store.getDoubtById(doubtId);
  if (doubt && doubt.authorId !== currentUser.id) {
    const notif = createNotification({
      type: 'reply',
      fromUserId: currentUser.id,
      doubtId,
      message: `${currentUser.name} replied to your doubt: "${doubt.description.slice(0, 30)}..."`,
    });
    store.addNotification(doubt.authorId, notif);
    updateNotifBadge();
  }

  renderReplies(doubtId, containerEl);
}

// ═══════════════════════════════════════════════════════════════
// DOUBT CREATION MODAL
// ═══════════════════════════════════════════════════════════════

function openModal() {
  // Force reflow then add open class for animation
  modalOverlay.classList.add('modal-overlay--open');
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
  modalOverlay.classList.remove('modal-overlay--open');
  modalOverlay.classList.add('modal-overlay--exit');
  setTimeout(() => {
    modalOverlay.classList.remove('modal-overlay--exit');
  }, 280);
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
    if (e.key === 'Escape' && modalOverlay.classList.contains('modal-overlay--open')) {
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
  renderPool();
}

function initPoolSearch() {
  const searchInput = document.getElementById('pool-search-input');
  if (!searchInput) return;
  let searchQuery = '';
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    const doubts = store.getDoubts();
    let poolDoubts = doubts.filter(
      (d) => d.status === 'open' || d.status === 'claimed'
    );
    // Apply pool filter
    if (activePoolFilter === 'eligible') {
      poolDoubts = poolDoubts.filter((d) => matchScore(currentUser, d) > 0.2);
    } else if (activePoolFilter === 'campus') {
      poolDoubts = poolDoubts.filter((d) => {
        const author = store.getUserById(d.authorId);
        return author && author.university === currentUser.university;
      });
    }
    // Apply search filter
    if (searchQuery) {
      poolDoubts = poolDoubts.filter((d) => {
        const desc = (d.description || '').toLowerCase();
        const tags = (d.tags || []).join(' ').toLowerCase();
        const author = store.getUserById(d.authorId);
        const authorName = author ? author.name.toLowerCase() : '';
        return desc.includes(searchQuery) || tags.includes(searchQuery) || authorName.includes(searchQuery);
      });
    }
    updateBubbles(poolDoubts, currentUser, matchScore);
    if (poolEmpty) {
      poolEmpty.style.display = poolDoubts.length === 0 ? '' : 'none';
    }
  });
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const count = store.getUnreadCount(currentUser.id);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function initNotifications() {
  const bellBtn = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  const listEl = document.getElementById('notif-list');
  const markAllBtn = document.getElementById('notif-mark-all');

  if (!bellBtn || !dropdown) return;

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) renderNotifications();
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      store.markAllNotificationsRead(currentUser.id);
      renderNotifications();
      updateNotifBadge();
    });
  }

  updateNotifBadge();
}

function renderNotifications() {
  const listEl = document.getElementById('notif-list');
  if (!listEl) return;

  const notifications = store.getNotifications(currentUser.id);

  if (notifications.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }

  listEl.innerHTML = notifications.slice(0, 20).map((n) => {
    const timeAgo = getTimeAgo(n.createdAt);
    const readClass = n.read ? '' : 'notif-item--unread';
    const iconMap = { claim: '🎯', resolve: '✅', rate: '⭐', like: '👍', reply: '💬', best_answer: '🏆' };
    const icon = iconMap[n.type] || '🔔';
    return `
      <div class="notif-item ${readClass}" data-notif-id="${n.id}" data-doubt-id="${n.doubtId}">
        <span class="notif-item__icon">${icon}</span>
        <div class="notif-item__content">
          <div class="notif-item__text">${escapeHtml(n.message)}</div>
          <div class="notif-item__time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.notif-item').forEach((el) => {
    el.addEventListener('click', () => {
      const notifId = el.dataset.notifId;
      const doubtId = el.dataset.doubtId;
      store.markNotificationRead(currentUser.id, notifId);
      updateNotifBadge();
      if (doubtId) showDoubtDetail(doubtId);
      document.getElementById('notif-dropdown').style.display = 'none';
    });
  });
}

function initDetailPanel() {
  if (detailClose) {
    detailClose.addEventListener('click', hideDoubtDetail);
  }
  // Close on overlay click
  if (detailPanel) {
    detailPanel.addEventListener('click', (e) => {
      if (e.target === detailPanel) hideDoubtDetail();
    });
    // Also close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && detailPanel.classList.contains('detail-panel--open')) {
        hideDoubtDetail();
      }
    });
  }
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
  initMyDoubtsTabs();
  initPoolTabs();
  initPoolSearch();
  initBubblePoolCanvas(); // internally calls refreshBubbles → renderPool → updateBubbles
  initModal();
  initDetailPanel();
  initNotifications();

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
