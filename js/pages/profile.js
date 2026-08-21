/* ============================================================
   profile.js — Profile Page Controller (V3)
   Sci-fi terminal style, photo card, engagement chart
   ============================================================ */

import * as store from '../store.js';

// ── DOM Refs ──
const nameEl = document.getElementById('profile-name');
const usernameEl = document.getElementById('profile-username');
const bioEl = document.getElementById('profile-bio');
const photoArea = document.getElementById('profile-photo-area');
const photoPlaceholder = document.getElementById('photo-placeholder');
const avatarUpload = document.getElementById('avatar-upload');
const emailEl = document.getElementById('profile-email');
const universityEl = document.getElementById('profile-university');
const campusEl = document.getElementById('profile-campus');
const yearEl = document.getElementById('profile-year');
const branchEl = document.getElementById('profile-branch');
const joinedEl = document.getElementById('profile-joined');
const skillTags = document.getElementById('skill-tags');
const daysEl = document.getElementById('stat-days');
const askedEl = document.getElementById('stat-asked');
const helpedEl = document.getElementById('stat-helped');
const repEl = document.getElementById('stat-rep');
const repLevel = document.getElementById('rep-level');
const engagementEl = document.getElementById('stat-engagement');
const repValueEl = document.getElementById('profile-rep-value');
const repFill = document.getElementById('profile-rep-fill');
const logoutBtn = document.getElementById('profile-logout');
const engagementChart = document.getElementById('engagement-chart');

function getRepLevel(score) {
  if (score >= 90) return 'LEGENDARY';
  if (score >= 70) return 'TRUSTED';
  if (score >= 55) return 'RISING';
  if (score >= 40) return 'NEWCOMER';
  return 'BEGINNER';
}

function renderProfile(user) {
  if (!user) return;

  nameEl.textContent = user.name;
  usernameEl.textContent = `@${user.username}`;
  if (user.bio) bioEl.textContent = user.bio;

  emailEl.textContent = user.email || '—';
  universityEl.textContent = user.university || '—';
  campusEl.textContent = user.campus || '—';
  yearEl.textContent = user.year || '—';
  branchEl.textContent = user.branch || '—';

  const joinDate = new Date(user.createdAt);
  joinedEl.textContent = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)));
  daysEl.textContent = daysSinceCreation;

  const doubts = store.getDoubts();
  const myDoubts = doubts.filter((d) => d.authorId === user.id);
  const asked = myDoubts.length;
  const helped = doubts.filter((d) => d.claimedBy === user.id).length;
  askedEl.textContent = asked;
  helpedEl.textContent = helped;

  const rep = user.reputationScore || 50;
  repEl.textContent = rep;
  repLevel.textContent = getRepLevel(rep);
  repValueEl.textContent = `${rep} / 100 XP`;
  repFill.style.width = `${rep}%`;

  const thisWeek = myDoubts.filter((d) => Date.now() - d.createdAt < 7 * 24 * 60 * 60 * 1000).length;
  engagementEl.textContent = `${thisWeek} this week`;

  // Skills
  const allSkills = [...(user.academicSkills || []), ...(user.nonacademicSkills || [])];
  skillTags.innerHTML = allSkills.map((s) =>
    `<span class="skill-pill">${escapeHtml(s)}</span>`
  ).join('');

  // Engagement chart (mock bar chart)
  renderEngagementChart(myDoubts);
}

function renderEngagementChart(myDoubts) {
  const bars = [];
  for (let i = 0; i < 14; i++) {
    const dayMs = i * 24 * 60 * 60 * 1000;
    const dayStart = Date.now() - (13 - i) * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = myDoubts.filter((d) => d.createdAt >= dayStart && d.createdAt < dayEnd).length;
    bars.push(count);
  }

  const max = Math.max(...bars, 1);
  engagementChart.innerHTML = bars.map((count, i) => {
    const h = Math.max(3, (count / max) * 100);
    const cls = count > 0 ? (i % 3 === 0 ? 'chart-bar--orange' : 'chart-bar--cyan') : 'chart-bar--dim';
    return `<div class="chart-bar ${cls}" style="height: ${h}%"></div>`;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initAvatarUpload() {
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = document.createElement('img');
      img.src = dataUrl;
      photoArea.innerHTML = '';
      photoArea.appendChild(img);
      photoArea.appendChild(avatarUpload.parentElement.querySelector('label') || createUploadLabel());
      const currentUser = store.getCurrentUser();
      if (currentUser) store.updateUser(currentUser.id, { avatar: dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

function loadAvatar(user) {
  if (user && user.avatar) {
    const img = document.createElement('img');
    img.src = user.avatar;
    photoArea.innerHTML = '';
    photoArea.appendChild(img);
    // Re-add upload button
    const label = document.createElement('label');
    label.className = 'pcard__upload-btn';
    label.setAttribute('for', 'avatar-upload');
    label.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    photoArea.appendChild(label);
    photoArea.appendChild(avatarUpload);
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const viewId = params.get('id');
  const currentUser = store.getCurrentUser();
  const viewUser = viewId ? store.getUserById(viewId) : currentUser;

  if (!viewUser) {
    window.location.href = 'login.html';
    return;
  }

  renderProfile(viewUser);
  loadAvatar(viewUser);
  initAvatarUpload();

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
