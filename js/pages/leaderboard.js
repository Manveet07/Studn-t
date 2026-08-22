/* ============================================================
   leaderboard.js — Leaderboard Page Controller
   Futuristic Glassmorphic Top-3 Podium + Audited Rankings List
   Dependencies: store.js, services/leaderboardService.js
   ============================================================ */

import * as store from '../store.js';
import { getLeaderboard, TIMEFRAMES } from '../services/leaderboardService.js';

// ── Auth & Current User ──
const currentUser = store.getCurrentUser();

// ── DOM References ──
const podiumContainer = document.getElementById('lb-podium');
const listBody = document.getElementById('lb-list-body');
const emptyState = document.getElementById('lb-empty');
const timeframeTabs = document.querySelectorAll('.lb-tab[data-timeframe]');
const campusDropdown = document.getElementById('lb-campus-dropdown');
const dropdownBtn = document.getElementById('lb-dropdown-btn');
const dropdownLabel = document.getElementById('lb-dropdown-label');
const dropdownItems = document.querySelectorAll('.lb-dropdown__item');
const userBar = document.getElementById('lb-user-bar');
const userBarRank = document.getElementById('user-bar-rank');
const userBarName = document.getElementById('user-bar-name');
const userBarSub = document.getElementById('user-bar-sub');
const userBarRep = document.getElementById('user-bar-rep');
const userBarPoints = document.getElementById('user-bar-points');
const logoutBtn = document.getElementById('sidebar-logout');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const sidebarAvatarLetter = document.getElementById('sidebar-avatar-letter');

// ── State ──
let activeTimeframe = TIMEFRAMES.ALL;
let campusFilter = 'all';

// ═══════════════════════════════════════════════════════════════
// BACKGROUND PARTICLES & STARS (Matching Dashboard Atmosphere)
// ═══════════════════════════════════════════════════════════════

function initBackground() {
  const canvas = document.getElementById('leaderboard-bg-canvas');
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
  for (let i = 0; i < 45; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.3 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.8,
    });
  }

  function animate(time) {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    // Ambient radial glow from the center top
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.15, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.6);
    grad.addColorStop(0, 'rgba(37, 99, 160, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    stars.forEach((s) => {
      const alpha = 0.1 + Math.sin(t * s.speed + s.phase) * 0.15 + 0.15;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 200, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════════
// RENDER HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderAvatar(user, customClass = '') {
  if (!user) return '<div class="podium-avatar">?</div>';
  if (user.avatar) {
    return `<div class="${customClass}"><img src="${user.avatar}" alt="${escapeHtml(user.name)}" /></div>`;
  }
  const initial = (user.name || '?').charAt(0).toUpperCase();
  return `<div class="${customClass}">${initial}</div>`;
}

// ═══════════════════════════════════════════════════════════════
// PODIUM RENDERING (Dynamic based strictly on LocalStorage users)
// ═══════════════════════════════════════════════════════════════

function renderPodiumCard(user, place) {
  if (!user) return '';

  const isFirst = place === '1st';
  const crownSvg = isFirst
    ? `<div class="podium-crown" title="Leaderboard Champion">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2zM2 5l5 6.5 5-6.5 5 6.5 5-6.5v11H2z"/></svg>
       </div>`
    : '';

  const rankBadgeClass = isFirst ? 'podium-rank-badge--1' : (place === '2nd' ? 'podium-rank-badge--2' : 'podium-rank-badge--3');
  const rankNum = isFirst ? '1' : (place === '2nd' ? '2' : '3');
  const avatarClass = 'podium-avatar';

  const universityBranch = [user.university, user.branch].filter(Boolean).join(' · ');

  return `
    <div class="podium-card podium-card--${place}">
      ${crownSvg}
      <div class="podium-avatar-wrap">
        ${renderAvatar(user, avatarClass)}
        <div class="podium-rank-badge ${rankBadgeClass}">${rankNum}</div>
      </div>
      <div class="podium-name" title="${escapeHtml(user.name)}">${escapeHtml(user.name)}</div>
      ${user.username ? `<div class="podium-handle">@${escapeHtml(user.username)}</div>` : ''}
      ${universityBranch ? `<div class="podium-sub">${escapeHtml(universityBranch)}</div>` : ''}
      <div class="podium-score-box">
        <span class="podium-points">${user.points} PTS</span>
        <span class="podium-rep-pill">${user.reputationScore} REP</span>
      </div>
    </div>
  `;
}

function renderPodium(podium, totalCount) {
  if (!podiumContainer) return;

  if (!totalCount || totalCount === 0 || !podium.first) {
    podiumContainer.innerHTML = '';
    podiumContainer.style.display = 'none';
    return;
  }

  podiumContainer.style.display = 'grid';

  if (totalCount === 1) {
    podiumContainer.style.gridTemplateColumns = '1fr';
    podiumContainer.style.maxWidth = '360px';
    podiumContainer.style.margin = '0 auto 36px auto';
    podiumContainer.innerHTML = renderPodiumCard(podium.first, '1st');
    return;
  }

  if (totalCount === 2) {
    podiumContainer.style.gridTemplateColumns = '1fr 1.15fr';
    podiumContainer.style.maxWidth = '720px';
    podiumContainer.style.margin = '0 auto 36px auto';
    podiumContainer.innerHTML = renderPodiumCard(podium.second, '2nd') + renderPodiumCard(podium.first, '1st');
    return;
  }

  // 3 or more users: standard 3-column podium (2nd, 1st, 3rd)
  podiumContainer.style.gridTemplateColumns = '1fr 1.15fr 1fr';
  podiumContainer.style.maxWidth = '';
  podiumContainer.style.margin = '';
  const leftCard = renderPodiumCard(podium.second, '2nd');
  const centerCard = renderPodiumCard(podium.first, '1st');
  const rightCard = renderPodiumCard(podium.third, '3rd');

  podiumContainer.innerHTML = leftCard + centerCard + rightCard;
}


// ═══════════════════════════════════════════════════════════════
// RANKINGS LIST RENDERING
// ═══════════════════════════════════════════════════════════════

function renderRankingsList(rankings) {
  if (!listBody) return;

  if (rankings.length === 0) {
    listBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  listBody.innerHTML = rankings.map((user) => {
    const isSelf = currentUser && user.userId === currentUser.id;
    const rowClass = isSelf ? 'lb-row lb-row--self' : 'lb-row';

    // Rank styling
    let rankHtml = '';
    if (user.rank === 1) {
      rankHtml = '<span class="lb-rank-badge lb-rank-badge--1">1</span>';
    } else if (user.rank === 2) {
      rankHtml = '<span class="lb-rank-badge lb-rank-badge--2">2</span>';
    } else if (user.rank === 3) {
      rankHtml = '<span class="lb-rank-badge lb-rank-badge--3">3</span>';
    } else {
      rankHtml = `#${user.rank}`;
    }

    const campusBranch = [user.campus || user.university, user.branch].filter(Boolean).join(' · ') || '—';

    return `
      <div class="${rowClass}" data-user-id="${user.userId}">
        <div class="lb-row__rank">${rankHtml}</div>
        <div class="lb-row__user">
          ${renderAvatar(user, 'lb-row__avatar')}
          <div class="lb-row__names">
            <span class="lb-row__name">${escapeHtml(user.name)}${isSelf ? ' <span style="font-size:0.75rem; color:var(--sphere-cyan); font-weight:700;">(YOU)</span>' : ''}</span>
            ${user.username ? `<span class="lb-row__username">@${escapeHtml(user.username)}</span>` : ''}
          </div>
        </div>
        <div class="lb-row__campus">
          <span class="lb-row__campus-pill" title="${escapeHtml(campusBranch)}">${escapeHtml(campusBranch)}</span>
        </div>
        <div class="lb-row__rep">
          <span class="lb-rep-badge">${user.reputationScore !== undefined ? user.reputationScore : 50} REP</span>
        </div>
        <div class="lb-row__contrib">
          <span>${user.contributionsCount || 0} answers</span>
        </div>
        <div class="lb-row__points">${user.points || 0} PTS</div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// USER LIVE STATUS BAR
// ═══════════════════════════════════════════════════════════════

function renderUserBar(rankings) {
  if (!userBar || !currentUser) {
    if (userBar) userBar.style.display = 'none';
    return;
  }

  const myEntry = rankings.find((r) => r.userId === currentUser.id);
  const myCampusBranch = [currentUser.university, currentUser.branch].filter(Boolean).join(' · ');

  if (myEntry) {
    userBar.style.display = 'flex';
    userBarRank.textContent = `#${myEntry.rank}`;
    userBarName.textContent = `${currentUser.name} (@${currentUser.username})`;
    userBarSub.textContent = myCampusBranch;
    userBarRep.textContent = `${myEntry.reputationScore} REP`;
    userBarPoints.textContent = `${myEntry.points} PTS`;
  } else {
    userBar.style.display = 'flex';
    userBarRank.textContent = '#—';
    userBarName.textContent = `${currentUser.name} (@${currentUser.username})`;
    userBarSub.textContent = myCampusBranch;
    userBarRep.textContent = `${currentUser.reputationScore || 50} REP`;
    userBarPoints.textContent = `${currentUser.leaderboardPoints || 0} PTS`;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN LEADERBOARD UPDATE
// ═══════════════════════════════════════════════════════════════

export function updateLeaderboard() {
  const campus = (campusFilter === 'mine' && currentUser) ? (currentUser.campus || currentUser.university) : null;
  const data = getLeaderboard({
    timeframe: activeTimeframe,
    campus,
    limit: 50,
  });

  renderPodium(data.podium, data.totalParticipants);
  renderRankingsList(data.rankings);
  renderUserBar(data.rankings);
}


// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS & INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function initEvents() {
  // Timeframe tabs
  timeframeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      timeframeTabs.forEach((t) => t.classList.remove('lb-tab--active'));
      tab.classList.add('lb-tab--active');
      activeTimeframe = tab.dataset.timeframe;
      updateLeaderboard();
    });
  });

  // Custom Glass Dropdown Events
  if (dropdownBtn && campusDropdown) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = campusDropdown.classList.toggle('lb-dropdown--open');
      dropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    dropdownItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownItems.forEach((i) => i.classList.remove('lb-dropdown__item--active'));
        item.classList.add('lb-dropdown__item--active');
        
        campusFilter = item.dataset.value;
        const textSpan = item.querySelector('span:last-child');
        if (dropdownLabel && textSpan) {
          dropdownLabel.textContent = textSpan.textContent;
        }

        campusDropdown.classList.remove('lb-dropdown--open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
        updateLeaderboard();
      });
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!campusDropdown.contains(e.target)) {
        campusDropdown.classList.remove('lb-dropdown--open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Sidebar Avatar & Logout
  if (currentUser) {
    if (sidebarAvatarLetter) {
      sidebarAvatarLetter.textContent = currentUser.name.charAt(0).toUpperCase();
    }
    if (sidebarAvatar && currentUser.avatar) {
      sidebarAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${escapeHtml(currentUser.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.logout();
      window.location.href = 'index.html';
    });
  }
}

function init() {
  initBackground();
  initEvents();
  updateLeaderboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
