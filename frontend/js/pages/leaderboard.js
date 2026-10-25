/* ============================================================
   leaderboard.js — Daily Leaderboard UI (reference-matched v2)
   Hero banner podium with laurel wreaths, 3D-style avatars,
   topbar rank chip, table action pills. Backend unchanged.
   ============================================================ */

import * as store from '../store.js';
import { getLeaderboard, TIMEFRAMES } from '../services/leaderboardService.js';

const currentUser = store.getCurrentUser();

const podiumContainer = document.getElementById('lb-podium');
const podiumBanner = document.getElementById('lb-podium-banner');
const listBody = document.getElementById('lb-list-body');
const emptyState = document.getElementById('lb-empty');
const timeframeTabs = document.querySelectorAll('.lb-tab[data-timeframe]');
const campusDropdown = document.getElementById('lb-campus-dropdown');
const dropdownBtn = document.getElementById('lb-dropdown-btn');
const dropdownLabel = document.getElementById('lb-dropdown-label');
const dropdownItems = document.querySelectorAll('.lb-dropdown__item');
const logoutBtn = document.getElementById('sidebar-logout');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const sidebarAvatarLetter = document.getElementById('sidebar-avatar-letter');
const resetCountdownEl = document.getElementById('lb-reset-countdown');
const resetTimerEl = document.getElementById('lb-reset-timer');
const searchInput = document.getElementById('lb-search-input');
const topbarRankBadge = document.getElementById('lb-topbar-rank');

let activeTimeframe = TIMEFRAMES.DAILY;
let campusFilter = 'all';
let searchQuery = '';
let lastRankings = [];
let countdownInterval = null;

function syncTabGlass(tab) {
  if (!tab || !tab.parentElement) return;
  tab.parentElement.style.setProperty('--tab-left', `${tab.offsetLeft}px`);
  tab.parentElement.style.setProperty('--tab-width', `${tab.offsetWidth}px`);
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULT 3D-STYLE CARTOON AVATARS (SVG)
   Guy with brown hair & glasses (2nd), bearded man in red hoodie (1st),
   girl with red hair & glasses (3rd), plus diverse set for rows.
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_AVATARS = [
  // 0: Young guy, brown swept hair, round glasses, rust tee (2nd place)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 130c3-20 20-31 43-31s40 11 43 31z" fill="#c95d20"/>
    <path d="M52 84h16v18c-3 2-13 2-16 0z" fill="#efc39a"/>
    <ellipse cx="60" cy="55" rx="27" ry="30" fill="#f2c69e"/>
    <circle cx="33" cy="58" r="5" fill="#f2c69e"/>
    <circle cx="87" cy="58" r="5" fill="#f2c69e"/>
    <path d="M31 52c-3-21 10-35 29-35s32 14 29 35c-2-8-5-13-9-16 1 3 1 6 0 8-5-7-12-11-20-11s-15 4-20 11c-1-2-1-5 0-8-4 3-7 8-9 16z" fill="#5b3d22"/>
    <path d="M36 34c6-6 14-9 24-9" stroke="#6b4a2c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="46" cy="58" r="10" fill="none" stroke="#43301e" stroke-width="2.4"/>
    <circle cx="74" cy="58" r="10" fill="none" stroke="#43301e" stroke-width="2.4"/>
    <path d="M56 58h8" stroke="#43301e" stroke-width="2.4"/>
    <circle cx="46" cy="58" r="3.8" fill="#33241a"/>
    <circle cx="74" cy="58" r="3.8" fill="#33241a"/>
    <circle cx="47.4" cy="56.6" r="1.2" fill="#fff"/>
    <circle cx="75.4" cy="56.6" r="1.2" fill="#fff"/>
    <path d="M39 47c3-2 8-2 11 0" stroke="#5b3d22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M70 47c3-2 8-2 11 0" stroke="#5b3d22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 61v6" stroke="#d9a274" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M51 74c3 3.5 15 3.5 18 0" stroke="#b5764c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 1: Bearded man, gray swept hair, round glasses, red hoodie (1st place)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 130c3-22 21-33 46-33s43 11 46 33z" fill="#b03a2e"/>
    <path d="M40 106c4-7 11-11 20-11s16 4 20 11c-5 5-12 8-20 8s-15-3-20-8z" fill="#8e2b20"/>
    <path d="M51 82h18v14c-4 3-14 3-18 0z" fill="#e2ae82"/>
    <path d="M33 50c-2 26 9 46 27 46s29-20 27-46c-5 13-15 19-27 19s-22-6-27-19z" fill="#cfc7b8"/>
    <ellipse cx="60" cy="51" rx="26" ry="29" fill="#e8b98e"/>
    <path d="M34 44c1-16 11-27 26-27s25 11 26 27c-3-8-8-13-13-14 1 2 1 4 0 6-4-5-8-8-13-8s-9 3-13 8c-1-2-1-4 0-6-5 1-10 6-13 14z" fill="#b5ad9e"/>
    <circle cx="46" cy="53" r="9.5" fill="rgba(255,255,255,0.12)" stroke="#4e4a42" stroke-width="2.4"/>
    <circle cx="74" cy="53" r="9.5" fill="rgba(255,255,255,0.12)" stroke="#4e4a42" stroke-width="2.4"/>
    <path d="M55.5 53h9" stroke="#4e4a42" stroke-width="2.4"/>
    <circle cx="46" cy="53" r="3.6" fill="#2e2a24"/>
    <circle cx="74" cy="53" r="3.6" fill="#2e2a24"/>
    <circle cx="47.3" cy="51.7" r="1.1" fill="#fff"/>
    <circle cx="75.3" cy="51.7" r="1.1" fill="#fff"/>
    <path d="M39 43c3-2 8-2 11 0" stroke="#a39a88" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M70 43c3-2 8-2 11 0" stroke="#a39a88" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 56v6" stroke="#c69468" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M49 66c3 2.5 7 3.5 11 3.5s8-1 11-3.5" stroke="#bdb5a5" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M54 75c2 1.8 4 2.6 6 2.6s4-0.8 6-2.6" stroke="#8f887a" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 2: Girl, auburn hair, round glasses, yellow top (3rd place)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 42c-5 30-3 54 3 64 6 3 58 3 64 0 6-10 8-34 3-64z" fill="#c05a28"/>
    <path d="M20 130c3-18 19-28 40-28s37 10 40 28z" fill="#eebd3a"/>
    <path d="M51 82h18v14c-4 3-14 3-18 0z" fill="#f0c29c"/>
    <ellipse cx="60" cy="53" rx="25" ry="28" fill="#f4cba4"/>
    <path d="M33 50c-2-19 10-32 27-32s29 13 27 32c-2-7-5-12-9-15-12 5-24 5-36 0-4 3-7 8-9 15z" fill="#cf6a30"/>
    <path d="M33 48c-3 9-3 18-1 26 3-3 5-7 6-12" fill="#cf6a30"/>
    <path d="M87 48c3 9 3 18 1 26-3-3-5-7-6-12" fill="#cf6a30"/>
    <circle cx="47" cy="56" r="9.5" fill="none" stroke="#7a4a28" stroke-width="2.4"/>
    <circle cx="73" cy="56" r="9.5" fill="none" stroke="#7a4a28" stroke-width="2.4"/>
    <path d="M56.5 56h7" stroke="#7a4a28" stroke-width="2.4"/>
    <circle cx="47" cy="56" r="3.6" fill="#3d2517"/>
    <circle cx="73" cy="56" r="3.6" fill="#3d2517"/>
    <circle cx="48.3" cy="54.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="54.7" r="1.1" fill="#fff"/>
    <path d="M40 47c3-2 7-2 10 0" stroke="#b55a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M70 47c3-2 7-2 10 0" stroke="#b55a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 59v5" stroke="#d9a274" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M52 71c2.5 3 13.5 3 16 0" stroke="#c07850" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 3: Dark-haired guy, blue shirt (row)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 130c3-19 20-30 42-30s39 11 42 30z" fill="#2f6db3"/>
    <path d="M52 84h16v18c-3 2-13 2-16 0z" fill="#c98e5a"/>
    <ellipse cx="60" cy="55" rx="26" ry="29" fill="#d29560"/>
    <path d="M32 52c-2-21 11-35 28-35s30 14 28 35c-2-8-5-13-9-16 1 3 1 6 0 8-5-7-12-11-19-11s-14 4-19 11c-1-2-1-5 0-8-4 3-7 8-9 16z" fill="#17110a"/>
    <circle cx="47" cy="57" r="3.6" fill="#241a10"/>
    <circle cx="73" cy="57" r="3.6" fill="#241a10"/>
    <circle cx="48.3" cy="55.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="55.7" r="1.1" fill="#fff"/>
    <path d="M40 47c3-2 8-2 11 0" stroke="#17110a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M69 47c3-2 8-2 11 0" stroke="#17110a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 60v5" stroke="#b0784a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M52 72c2.5 3 13.5 3 16 0" stroke="#8a5a34" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 4: Woman, dark skin, black hair, gold hoops, purple top (row)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 40c-6 32-3 58 3 68 7 3 59 3 66 0 6-10 9-36 3-68z" fill="#1c1210"/>
    <path d="M20 130c3-18 19-28 40-28s37 10 40 28z" fill="#8e44ad"/>
    <path d="M51 82h18v14c-4 3-14 3-18 0z" fill="#9c6644"/>
    <ellipse cx="60" cy="53" rx="25" ry="28" fill="#a9754f"/>
    <path d="M33 50c-2-19 10-32 27-32s29 13 27 32c-2-7-5-12-9-15-12 5-24 5-36 0-4 3-7 8-9 15z" fill="#241812"/>
    <circle cx="47" cy="56" r="3.6" fill="#1d120b"/>
    <circle cx="73" cy="56" r="3.6" fill="#1d120b"/>
    <circle cx="48.3" cy="54.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="54.7" r="1.1" fill="#fff"/>
    <path d="M40 47c3-2 8-2 11 0" stroke="#241812" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M69 47c3-2 8-2 11 0" stroke="#241812" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M52 71c2.5 3 13.5 3 16 0" stroke="#7a4a2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="37" cy="66" r="3" fill="none" stroke="#e8b23a" stroke-width="1.8"/>
    <circle cx="83" cy="66" r="3" fill="none" stroke="#e8b23a" stroke-width="1.8"/>
  </svg>`,

  // 5: Curly hair guy, green shirt (row)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 130c3-19 20-30 42-30s39 11 42 30z" fill="#1e8e5a"/>
    <path d="M52 84h16v18c-3 2-13 2-16 0z" fill="#8a5a34"/>
    <ellipse cx="60" cy="55" rx="26" ry="29" fill="#96683e"/>
    <circle cx="30" cy="38" r="8" fill="#241a10"/>
    <circle cx="42" cy="28" r="9" fill="#241a10"/>
    <circle cx="58" cy="24" r="9" fill="#241a10"/>
    <circle cx="74" cy="27" r="9" fill="#241a10"/>
    <circle cx="87" cy="36" r="8" fill="#241a10"/>
    <circle cx="92" cy="48" r="7" fill="#241a10"/>
    <circle cx="28" cy="50" r="7" fill="#241a10"/>
    <path d="M34 52c1-18 12-30 26-30s25 12 26 30" fill="#241a10"/>
    <circle cx="47" cy="57" r="3.6" fill="#1d120b"/>
    <circle cx="73" cy="57" r="3.6" fill="#1d120b"/>
    <circle cx="48.3" cy="55.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="55.7" r="1.1" fill="#fff"/>
    <path d="M40 48c3-2 8-2 11 0" stroke="#241a10" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M69 48c3-2 8-2 11 0" stroke="#241a10" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 60v5" stroke="#7a4e2a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M52 72c2.5 3 13.5 3 16 0" stroke="#5e3a1e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 6: Ponytail girl, pink top (row)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M84 34c8-2 16 2 18 10 2 9-2 18-8 22l-6-6c4-3 6-8 5-13-1-4-4-7-9-7z" fill="#7a4a1a"/>
    <path d="M24 42c-5 30-3 54 3 64 6 3 58 3 64 0 6-10 8-34 3-64z" fill="#7a4a1a"/>
    <path d="M20 130c3-18 19-28 40-28s37 10 40 28z" fill="#d63384"/>
    <path d="M51 82h18v14c-4 3-14 3-18 0z" fill="#f0c29c"/>
    <ellipse cx="60" cy="53" rx="25" ry="28" fill="#f4cba4"/>
    <path d="M33 50c-2-19 10-32 27-32s29 13 27 32c-2-7-5-12-9-15-12 5-24 5-36 0-4 3-7 8-9 15z" fill="#8a5a22"/>
    <circle cx="47" cy="56" r="3.6" fill="#3d2517"/>
    <circle cx="73" cy="56" r="3.6" fill="#3d2517"/>
    <circle cx="48.3" cy="54.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="54.7" r="1.1" fill="#fff"/>
    <path d="M40 47c3-2 8-2 11 0" stroke="#8a5a22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M69 47c3-2 8-2 11 0" stroke="#8a5a22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 59v5" stroke="#d9a274" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M52 71c2.5 3 13.5 3 16 0" stroke="#c07850" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 7: Cap guy, indigo shirt (row)
  `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 130c3-19 20-30 42-30s39 11 42 30z" fill="#4a52c0"/>
    <path d="M52 84h16v18c-3 2-13 2-16 0z" fill="#d9a274"/>
    <ellipse cx="60" cy="56" rx="26" ry="28" fill="#e2ac80"/>
    <path d="M32 48c0-14 12-26 28-26s28 12 28 26z" fill="#2a2a34"/>
    <path d="M28 48h64c2 0 4 2 4 4s-2 4-4 4H28c-2 0-4-2-4-4s2-4 4-4z" fill="#1e1e28"/>
    <circle cx="47" cy="60" r="3.6" fill="#2a1e14"/>
    <circle cx="73" cy="60" r="3.6" fill="#2a1e14"/>
    <circle cx="48.3" cy="58.7" r="1.1" fill="#fff"/>
    <circle cx="74.3" cy="58.7" r="1.1" fill="#fff"/>
    <path d="M60 63v5" stroke="#b5784e" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M52 74c2.5 3 13.5 3 16 0" stroke="#96603c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,
];

function hashId(id) {
  if (!id) return 0;
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getDefaultAvatarSvg(userId, rankHint) {
  if (rankHint === 1) return DEFAULT_AVATARS[1];
  if (rankHint === 2) return DEFAULT_AVATARS[0];
  if (rankHint === 3) return DEFAULT_AVATARS[2];
  return DEFAULT_AVATARS[hashId(userId) % (DEFAULT_AVATARS.length - 3) + 3];
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function avatarHtml(user, className, rankHint) {
  if (user && user.avatar) {
    return `<div class="${className}"><img src="${user.avatar}" alt="" /></div>`;
  }
  const svg = getDefaultAvatarSvg(user && (user.userId || user.id), rankHint);
  return `<div class="${className} ${className}--default">${svg}</div>`;
}

/* ═══════════════════════════════════════════════════════════════
   LAUREL WREATH SVGs — circular leaf-wreath badge with rank text
   ═══════════════════════════════════════════════════════════════ */

function laurelWreathSvg(place) {
  const themes = {
    '1st': { leaf: '#f6cf5d', leaf2: '#e2a832', stem: '#c8922e', text: '#ffffff' },
    '2nd': { leaf: '#ece8f4', leaf2: '#c9c0da', stem: '#b3a9c7', text: '#ffffff' },
    '3rd': { leaf: '#ece8f4', leaf2: '#c9c0da', stem: '#b3a9c7', text: '#ffffff' },
  };
  const c = themes[place] || themes['3rd'];
  const left = [
    [31, 80, -64], [23, 70, -46], [18, 58, -27], [16.5, 46, -8],
    [19, 34, 12], [25.5, 24, 32], [34, 17, 52],
  ];
  const right = left.map(([x, y]) => [100 - x, y]);
  const rotR = [64, 46, 27, 8, -12, -32, -52];
  const leafEl = ([x, y, r], i) =>
    `<ellipse cx="${x}" cy="${y}" rx="3.1" ry="6.8" transform="rotate(${r} ${x} ${y})" fill="${i % 2 ? c.leaf2 : c.leaf}"/>`;
  const leavesL = left.map(leafEl).join('');
  const leavesR = right.map((p, i) => leafEl([p[0], p[1], rotR[i]], i)).join('');
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M36 86C24 79 16 66 16 52c0-9 3-17 8-24" stroke="${c.stem}" stroke-width="1.6" fill="none" opacity="0.7"/>
    <path d="M64 86c12-7 20-20 20-34 0-9-3-17-8-24" stroke="${c.stem}" stroke-width="1.6" fill="none" opacity="0.7"/>
    ${leavesL}${leavesR}
    <text x="50" y="56.5" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16.5" font-weight="700" fill="${c.text}" stroke="rgba(20,10,30,0.45)" stroke-width="0.6" paint-order="stroke">${place}</text>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════
   COUNTDOWN TIMER
   ═══════════════════════════════════════════════════════════════ */

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function updateCountdown() {
  if (!resetCountdownEl) return;
  const ms = getMsUntilMidnight();
  resetCountdownEl.textContent = formatCountdown(ms);
  if (ms <= 1000 && activeTimeframe === TIMEFRAMES.DAILY) updateLeaderboard();
}

function startCountdown() {
  updateCountdown();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdown, 1000);
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND: stars + planet horizon
   ═══════════════════════════════════════════════════════════════ */

function initBackground() {
  const canvas = document.getElementById('leaderboard-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const w = () => window.innerWidth;
  const h = () => window.innerHeight;
  const stars = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.75,
      r: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.9,
    });
  }

  function animate(time) {
    const t = time * 0.001;
    const W = w();
    const H = h();
    ctx.clearRect(0, 0, W, H);
    stars.forEach((s) => {
      const alpha = 0.15 + Math.sin(t * s.speed + s.phase) * 0.2 + 0.2;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

/* ═══════════════════════════════════════════════════════════════
   PODIUM — 2nd, 1st, 3rd inside hero banner with laurel wreaths
   ═══════════════════════════════════════════════════════════════ */

function renderPodiumCard(user, place, rankNum) {
  if (!user) return '';
  let avatar;
  if (user.avatar) {
    avatar = `<div class="podium-avatar podium-avatar--img"><img src="${user.avatar}" alt="" /></div>`;
  } else {
    const svg = getDefaultAvatarSvg(user.userId || user.id, rankNum);
    avatar = `<div class="podium-avatar">${svg}</div>`;
  }
  return `
    <div class="podium-card podium-card--${place}">
      <div class="podium-wreath">${laurelWreathSvg(place)}</div>
      ${avatar}
    </div>
  `;
}

function renderPodium(podium, totalCount) {
  if (!podiumContainer) return;
  if (!totalCount || !podium.first) {
    podiumContainer.innerHTML = '';
    if (podiumBanner) podiumBanner.style.display = 'none';
    return;
  }
  if (podiumBanner) podiumBanner.style.display = 'block';

  let html = '';
  if (totalCount === 1) {
    html = renderPodiumCard(podium.first, '1st', 1);
  } else if (totalCount === 2) {
    html =
      renderPodiumCard(podium.second, '2nd', 2) +
      renderPodiumCard(podium.first, '1st', 1);
  } else {
    html =
      renderPodiumCard(podium.second, '2nd', 2) +
      renderPodiumCard(podium.first, '1st', 1) +
      renderPodiumCard(podium.third, '3rd', 3);
  }
  podiumContainer.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   RANKINGS LIST — checkbox, rank, user, campus, rep, contrib, points, action
   ═══════════════════════════════════════════════════════════════ */

function renderRankingsList(rankings) {
  if (!listBody) return;

  let filtered = rankings;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = rankings.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.university && u.university.toLowerCase().includes(q)) ||
        (u.campus && u.campus.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    listBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  listBody.innerHTML = filtered
    .map((user) => {
      const isSelf = currentUser && user.userId === currentUser.id;
      const rowClass = isSelf ? 'lb-row lb-row--self' : 'lb-row';
      let rankHtml;
      if (user.rank === 1) rankHtml = '<span class="lb-rank-badge lb-rank-badge--1">#01</span>';
      else if (user.rank === 2) rankHtml = '<span class="lb-rank-badge lb-rank-badge--2">#02</span>';
      else if (user.rank === 3) rankHtml = '<span class="lb-rank-badge lb-rank-badge--3">#03</span>';
      else rankHtml = `<span class="lb-rank-num">#${String(user.rank).padStart(2, '0')}</span>`;

      const campusBranch =
        [user.campus || user.university, user.branch].filter(Boolean).join(' · ') || '—';

      const youTag = isSelf ? '<span class="lb-you-tag">YOU</span>' : '';

      return `
      <div class="${rowClass}" data-user-id="${user.userId}">
        <div class="lb-row__check">
          <div class="lb-checkbox ${isSelf ? 'lb-checkbox--checked' : ''}" role="checkbox" aria-checked="${isSelf}"></div>
        </div>
        <div class="lb-row__rank">${rankHtml}</div>
        <div class="lb-row__user">
          ${avatarHtml(user, 'lb-row__avatar', user.rank)}
          <div class="lb-row__names">
            <span class="lb-row__name">${escapeHtml(user.name)} ${youTag}</span>
            ${user.username ? `<span class="lb-row__username">@${escapeHtml(user.username)}</span>` : ''}
          </div>
        </div>
        <div class="lb-row__campus">
          <span class="lb-row__campus-pill" title="${escapeHtml(campusBranch)}">${escapeHtml(campusBranch)}</span>
        </div>
        <div class="lb-row__rep">
          <span class="lb-rep-badge">${user.reputationScore !== undefined ? user.reputationScore : 50}</span>
        </div>
        <div class="lb-row__contrib"><span>${user.contributionsCount || 0}</span></div>
        <div class="lb-row__points">${user.points || 0}</div>
        <div class="lb-row__action">
          <button class="lb-action-pill" type="button" data-profile-id="${escapeHtml(user.userId)}" title="View profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            View
          </button>
        </div>
      </div>`;
    })
    .join('');
}

/* ═══════════════════════════════════════════════════════════════
   TOPBAR — rank badge update
   ═══════════════════════════════════════════════════════════════ */

function updateTopbarRank(rankings) {
  if (!topbarRankBadge || !currentUser) return;
  const myEntry = rankings.find((r) => r.userId === currentUser.id);
  if (myEntry) {
    topbarRankBadge.textContent = `Rank #${myEntry.rank}`;
  } else {
    topbarRankBadge.textContent = '';
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN UPDATE
   ═══════════════════════════════════════════════════════════════ */

export function updateLeaderboard() {
  const campus =
    campusFilter === 'mine' && currentUser
      ? currentUser.campus || currentUser.university
      : null;
  const data = getLeaderboard({
    timeframe: activeTimeframe,
    campus,
    limit: 50,
  });
  lastRankings = data.rankings;
  renderPodium(data.podium, data.totalParticipants);
  renderRankingsList(data.rankings);
  updateTopbarRank(data.rankings);
  if (resetTimerEl) {
    resetTimerEl.classList.toggle('lb-reset-timer--active', activeTimeframe === TIMEFRAMES.DAILY);
  }
}

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */

function initTopbarUser() {
  const nameEl = document.getElementById('lb-topbar-name');
  const avEl = document.getElementById('lb-topbar-avatar');
  if (!currentUser) {
    if (nameEl) nameEl.textContent = 'Guest';
    if (avEl) avEl.innerHTML = getDefaultAvatarSvg('guest', 0);
    return;
  }
  if (nameEl) nameEl.textContent = currentUser.name || currentUser.username || 'You';
  if (avEl) {
    if (currentUser.avatar) {
      avEl.innerHTML = `<img src="${currentUser.avatar}" alt="" />`;
    } else {
      avEl.innerHTML = getDefaultAvatarSvg(currentUser.id, 0);
    }
  }
  if (sidebarAvatarLetter) {
    sidebarAvatarLetter.textContent = (currentUser.name || '?').charAt(0).toUpperCase();
  }
  if (sidebarAvatar && currentUser.avatar) {
    sidebarAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }
}

function initEvents() {
  if (listBody) {
    listBody.addEventListener('click', (event) => {
      const viewButton = event.target.closest('[data-profile-id]');
      if (!viewButton) return;
      const profileId = viewButton.dataset.profileId;
      if (profileId) window.location.href = `profile.html?id=${encodeURIComponent(profileId)}`;
    });
  }

  timeframeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      timeframeTabs.forEach((t) => t.classList.remove('lb-tab--active'));
      tab.classList.add('lb-tab--active');
      syncTabGlass(tab);
      activeTimeframe = tab.dataset.timeframe;
      updateLeaderboard();
    });
  });

  syncTabGlass(document.querySelector('.lb-tab--active'));

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
        if (dropdownLabel && textSpan) dropdownLabel.textContent = textSpan.textContent;
        campusDropdown.classList.remove('lb-dropdown--open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
        updateLeaderboard();
      });
    });
    document.addEventListener('click', (e) => {
      if (!campusDropdown.contains(e.target)) {
        campusDropdown.classList.remove('lb-dropdown--open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderRankingsList(lastRankings);
    });
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
  initTopbarUser();
  initEvents();
  startCountdown();
  updateLeaderboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
