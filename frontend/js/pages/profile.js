/* ============================================================
   profile.js — Profile Page Controller (V3)
   Dashboard-card layout: hero, stats, rep level, badges,
   top skills, recent activity. Default avatar is a random
   cartoon (DiceBear, stable seed) replaceable via upload.
   ============================================================ */

import * as store from '../store.js';

// ── DOM Refs ──
const nameEl = document.getElementById('profile-name');
const usernameEl = document.getElementById('profile-username');
const bioEl = document.getElementById('profile-bio');
const avatarImg = document.getElementById('avatar-img');
const avatarFallback = document.getElementById('photo-placeholder');
const avatarUpload = document.getElementById('avatar-upload');
const metaYearEl = document.getElementById('meta-year');
const metaBranchEl = document.getElementById('meta-branch');
const metaUniversityEl = document.getElementById('meta-university');
const emailEl = document.getElementById('profile-email');
const universityEl = document.getElementById('profile-university');
const campusEl = document.getElementById('profile-campus');
const yearEl = document.getElementById('profile-year');
const branchEl = document.getElementById('profile-branch');
const joinedEl = document.getElementById('profile-joined');
const askedEl = document.getElementById('stat-asked');
const solvedEl = document.getElementById('stat-solved');
const solutionsEl = document.getElementById('stat-solutions');
const repEl = document.getElementById('stat-rep');
const repLevel = document.getElementById('rep-level');
const repValueEl = document.getElementById('profile-rep-value');
const repFill = document.getElementById('profile-rep-fill');
const repNext = document.getElementById('rep-next');
const badgesRow = document.getElementById('badges-row');
const skillsRings = document.getElementById('skills-rings');
const activityList = document.getElementById('activity-list');
const logoutBtn = document.getElementById('profile-logout');
const heroActions = document.getElementById('hero-actions');
const editBtn = document.getElementById('edit-profile-btn');
const menuBtn = document.getElementById('hero-menu-btn');
const menuEl = document.getElementById('hero-menu');
const menuChangePhoto = document.getElementById('menu-change-photo');
const menuLogout = document.getElementById('menu-logout');
const editModal = document.getElementById('edit-modal');
const editModalBackdrop = document.getElementById('edit-modal-backdrop');
const editModalClose = document.getElementById('edit-modal-close');
const editName = document.getElementById('edit-name');
const editBio = document.getElementById('edit-bio');
const editError = document.getElementById('edit-error');
const editSave = document.getElementById('edit-save');

// ── Reputation levels (matches leaderboard logic) ──
const REP_LEVELS = [
  { name: 'BEGINNER', min: 0 },
  { name: 'NEWCOMER', min: 40 },
  { name: 'RISING', min: 55 },
  { name: 'TRUSTED', min: 70 },
  { name: 'LEGENDARY', min: 90 },
];

function getRepLevel(score) {
  let level = REP_LEVELS[0];
  for (const l of REP_LEVELS) if (score >= l.min) level = l;
  return level;
}

function getNextLevel(score) {
  return REP_LEVELS.find((l) => l.min > score) || null;
}

// ── Helpers ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function truncate(str, n) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ── Default Avatar: random cartoon, stable per user ──
const AVATAR_STYLES = ['adventurer', 'big-smile', 'fun-emoji', 'bottts', 'miniatures'];

function defaultAvatarUrl(user) {
  const seed = encodeURIComponent(user.id || user.username || 'studnt');
  const style = AVATAR_STYLES[hashStr(seed) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=0d1524`;
}

function setAvatar(user) {
  const src = user.avatar || defaultAvatarUrl(user);
  avatarFallback.hidden = false;
  avatarImg.hidden = true;
  avatarImg.onload = () => {
    avatarImg.hidden = false;
    avatarFallback.hidden = true;
  };
  avatarImg.onerror = () => {
    avatarImg.hidden = true;
    avatarFallback.hidden = false;
  };
  avatarImg.src = src;
}

// ── Badges ──
const BADGE_ICONS = {
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>',
  bug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
};

function renderBadges(stats) {
  const badges = [
    { icon: 'chat', color: '#34d399', label: 'First Steps — asked a doubt', earned: stats.asked >= 1 },
    { icon: 'flame', color: '#e8863a', label: 'Problem Solver — solved a doubt', earned: stats.solved >= 1 },
    { icon: 'bulb', color: '#a78bfa', label: 'Bright Mind — gave a solution', earned: stats.solutions >= 1 },
    { icon: 'bug', color: '#f87171', label: 'Bug Hunter — 3+ solutions given', earned: stats.solutions >= 3 },
    { icon: 'lock', color: '#fbbf24', label: stats.legendary ? 'Legendary reputation' : 'Locked — reach LEGENDARY rep', earned: stats.legendary },
  ];

  badgesRow.innerHTML = badges.map((b) => {
    const style = b.earned ? ` style="--hex-color: ${b.color}55"` : '';
    return `
    <div class="hex-badge ${b.earned ? '' : 'hex-badge--locked'}"${style} title="${escapeHtml(b.label)}">
      ${BADGE_ICONS[b.earned ? b.icon : 'lock']}
    </div>
  `;
  }).join('');
}

// ── Top Skills ──
const SKILL_COLORS = ['#38bdf8', '#a78bfa', '#e8863a', '#2dd4bf', '#34d399'];
const RING_RADIUS = 26;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function renderSkills(user) {
  const skills = [...(user.academicSkills || []), ...(user.nonacademicSkills || [])].slice(0, 4);
  if (skills.length === 0) {
    skillsRings.innerHTML = '<div class="activity-empty">// no skills declared</div>';
    return;
  }
  skillsRings.innerHTML = skills.map((s, i) => {
    const pct = 40 + (hashStr(s) % 56);
    const color = SKILL_COLORS[i % SKILL_COLORS.length];
    return `
      <div class="skill-ring">
        <div class="skill-ring__circle">
          <svg viewBox="0 0 64 64">
            <circle class="skill-ring__track" cx="32" cy="32" r="${RING_RADIUS}"/>
            <circle class="skill-ring__fill" cx="32" cy="32" r="${RING_RADIUS}"
              style="stroke: ${color}"
              data-pct="${pct}"
              stroke-dasharray="${RING_CIRC.toFixed(2)}"
              stroke-dashoffset="${RING_CIRC.toFixed(2)}"/>
          </svg>
          <span class="skill-ring__pct">${pct}%</span>
        </div>
        <span class="skill-ring__name" title="${escapeHtml(s)}">${escapeHtml(s)}</span>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      skillsRings.querySelectorAll('.skill-ring__fill').forEach((el) => {
        const pct = Number(el.dataset.pct);
        el.style.strokeDashoffset = (RING_CIRC * (1 - pct / 100)).toFixed(2);
      });
    });
  });
}

// ── Recent Activity ──
const ACT_ICONS = {
  answered: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  asked: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  solved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/><path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M6 9h12a2 2 0 0 1 2 2v1a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-1a2 2 0 0 1 2-2Z"/></svg>',
};

function renderActivity(user, doubts) {
  const doubtById = new Map(doubts.map((d) => [d.id, d]));
  const items = [];

  // Replies → answered / badge earned
  store.getReplies()
    .filter((r) => r.authorId === user.id)
    .forEach((r) => {
      const doubt = doubtById.get(r.doubtId);
      if (r.isBestAnswer) {
        items.push({ icon: 'badge', tone: 'orange', title: 'Earned a badge', sub: 'Problem Solver — best answer', ts: r.createdAt });
      }
      items.push({
        icon: 'answered',
        tone: 'green',
        title: 'Answered a doubt',
        sub: truncate(doubt ? doubt.description : '', 48),
        ts: r.createdAt,
      });
    });

  // Doubts asked
  doubts.filter((d) => d.authorId === user.id).forEach((d) => {
    items.push({ icon: 'asked', tone: 'cyan', title: 'Asked a doubt', sub: truncate(d.description, 48), ts: d.createdAt });
  });

  // Doubts solved
  doubts.filter((d) => d.claimedBy === user.id && d.status === 'resolved').forEach((d) => {
    items.push({ icon: 'solved', tone: 'cyan', title: 'Solved a doubt', sub: truncate(d.description, 48), ts: d.resolvedAt || d.createdAt });
  });

  items.sort((a, b) => b.ts - a.ts);
  const top = items.slice(0, 4);

  if (top.length === 0) {
    activityList.innerHTML = '<div class="activity-empty">// no activity yet — go help someone!</div>';
    return;
  }

  activityList.innerHTML = top.map((it) => `
    <div class="activity-item">
      <div class="activity-item__icon activity-item__icon--${it.tone}">${ACT_ICONS[it.icon]}</div>
      <div class="activity-item__body">
        <div class="activity-item__title activity-item__title--${it.tone}">${escapeHtml(it.title)}</div>
        <div class="activity-item__sub">${escapeHtml(it.sub || '')}</div>
      </div>
      <span class="activity-item__time">${timeAgo(it.ts)}</span>
    </div>
  `).join('');
}

// ── Render Profile ──
function renderProfile(user) {
  if (!user) return;

  nameEl.textContent = user.name;
  usernameEl.textContent = `@${user.username}`;
  bioEl.textContent = user.bio || '>_ i code';

  metaYearEl.textContent = user.year ? `${user.year} Year` : '—';
  metaBranchEl.textContent = user.branch || '—';
  metaUniversityEl.textContent = user.university || '—';

  emailEl.textContent = user.email || '—';
  universityEl.textContent = user.university || '—';
  campusEl.textContent = user.campus || '—';
  yearEl.textContent = user.year || '—';
  branchEl.textContent = user.branch || '—';
  const joinDate = new Date(user.createdAt);
  joinedEl.textContent = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const doubts = store.getDoubts();
  const myDoubts = doubts.filter((d) => d.authorId === user.id);
  const solved = doubts.filter((d) => d.claimedBy === user.id && d.status === 'resolved').length;
  const solutions = store.getReplies().filter((r) => r.authorId === user.id).length;

  askedEl.textContent = myDoubts.length;
  solvedEl.textContent = solved;
  solutionsEl.textContent = solutions;

  const rep = user.reputationScore || 50;
  const level = getRepLevel(rep);
  const next = getNextLevel(rep);

  repEl.textContent = rep;
  repLevel.textContent = level.name;
  repValueEl.textContent = `${rep} / 100 XP`;
  repFill.style.width = `${rep}%`;
  repNext.innerHTML = next
    ? `Next: <strong>${next.name}</strong> (${next.min} REP)`
    : 'Max level reached';

  renderBadges({
    asked: myDoubts.length,
    solved,
    solutions,
    legendary: rep >= 90,
  });

  renderSkills(user);
  renderActivity(user, doubts);
}

// ── Avatar Upload ──
function initAvatarUpload() {
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      avatarImg.src = dataUrl;
      avatarImg.hidden = false;
      avatarFallback.hidden = true;
      const currentUser = store.getCurrentUser();
      if (currentUser) store.updateUser(currentUser.id, { avatar: dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

// ── Edit Modal ──
let editingUser = null;

function openEditModal() {
  if (!editingUser) return;
  editName.value = editingUser.name;
  editBio.value = editingUser.bio || '';
  editError.textContent = '';
  editModal.hidden = false;
  editName.focus();
}

function closeEditModal() {
  editModal.hidden = true;
}

function initEditModal() {
  editBtn.addEventListener('click', openEditModal);
  editModalClose.addEventListener('click', closeEditModal);
  editModalBackdrop.addEventListener('click', closeEditModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !editModal.hidden) closeEditModal();
  });

  editSave.addEventListener('click', () => {
    const name = editName.value.trim();
    const bio = editBio.value.trim();
    if (name.length < 2) {
      editError.textContent = 'Name must be at least 2 characters.';
      return;
    }
    store.updateUser(editingUser.id, { name, bio });
    editingUser = { ...editingUser, name, bio };
    renderProfile(editingUser);
    setAvatar(editingUser);
    closeEditModal();
  });
}

// ── Kebab Menu ──
function initMenu() {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuEl.hidden = !menuEl.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!menuEl.hidden && !menuEl.contains(e.target)) menuEl.hidden = true;
  });

  menuChangePhoto.addEventListener('click', () => {
    menuEl.hidden = true;
    avatarUpload.click();
  });

  menuLogout.addEventListener('click', () => {
    store.logout();
    window.location.href = 'index.html';
  });
}

// ── Init ──
function init() {
  const params = new URLSearchParams(window.location.search);
  const viewId = params.get('id');
  const currentUser = store.getCurrentUser();
  const viewUser = viewId ? store.getUserById(viewId) : currentUser;

  if (!viewUser) {
    window.location.href = 'login.html';
    return;
  }

  // Show content after auth confirmed
  document.querySelector('.profile-shell').style.opacity = '1';

  const isOwn = currentUser && currentUser.id === viewUser.id;
  if (!isOwn) {
    heroActions.style.display = 'none';
    document.getElementById('avatar-edit-label').style.display = 'none';
  }

  editingUser = isOwn ? currentUser : null;

  renderProfile(viewUser);
  setAvatar(viewUser);
  if (isOwn) {
    initAvatarUpload();
    initEditModal();
    initMenu();
  }

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
