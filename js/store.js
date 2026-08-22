/* ============================================================
   store.js — LocalStorage Abstraction
   THE ONLY module allowed to touch localStorage directly.
   Every other module reads/writes data through this.
   This is what makes Phase 2 (LocalStorage → fetch → Express)
   a one-file change instead of a find-and-replace.

   Dependencies: NONE
   ============================================================ */

const STORAGE_KEYS = {
  USERS: 'pd_users',
  CURRENT_USER: 'pd_currentUserId',
  DOUBTS: 'pd_doubts',
  REPLIES: 'pd_replies',
  EVENTS: 'pd_events',
};

// ── Read ──

export function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || null;
}

export function getCurrentUser() {
  const id = getCurrentUserId();
  if (!id) return null;
  return getUsers().find((u) => u.id === id) || null;
}

export function getDoubts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOUBTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

export function getDoubtById(id) {
  return getDoubts().find((d) => d.id === id) || null;
}

// ── Write ──

export function setUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function setCurrentUserId(id) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, id);
}

export function setDoubts(doubts) {
  localStorage.setItem(STORAGE_KEYS.DOUBTS, JSON.stringify(doubts));
}

// ── Convenience: Add / Update ──

export function addUser(user) {
  const users = getUsers();
  users.push(user);
  setUsers(users);
}

export function updateUser(id, updates) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  setUsers(users);
  return users[idx];
}

export function addDoubt(doubt) {
  const doubts = getDoubts();
  doubts.push(doubt);
  setDoubts(doubts);
}

export function updateDoubt(id, updates) {
  const doubts = getDoubts();
  const idx = doubts.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  doubts[idx] = { ...doubts[idx], ...updates };
  setDoubts(doubts);
  return doubts[idx];
}

// ── Utility ──

export function usernameExists(username) {
  return getUsers().some(
    (u) => typeof u?.username === 'string' && u.username.toLowerCase() === username.toLowerCase()
  );
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ── Auth ──

export function loginUser(identifier, password) {
  const users = getUsers();
  const user = users.find((u) => {
    const idLower = identifier.toLowerCase().trim();
    return (
      (u.username && u.username.toLowerCase() === idLower) ||
      (u.email && u.email.toLowerCase() === idLower)
    );
  });
  if (!user) return { success: false, error: 'No account found with that username or email.' };
  if (user.password !== password) return { success: false, error: 'Incorrect password.' };
  setCurrentUserId(user.id);
  return { success: true, user };
}

export function getPastProfiles() {
  const users = getUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
  }));
}

// ── Notifications ──

export function getNotifications(userId) {
  const user = getUserById(userId);
  return user ? (user.notifications || []) : [];
}

export function getUnreadCount(userId) {
  return getNotifications(userId).filter((n) => !n.read).length;
}

export function addNotification(userId, notification) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  if (!users[idx].notifications) users[idx].notifications = [];
  users[idx].notifications.unshift(notification); // newest first
  // Keep only last 50 notifications
  if (users[idx].notifications.length > 50) {
    users[idx].notifications = users[idx].notifications.slice(0, 50);
  }
  setUsers(users);
}

export function markNotificationRead(userId, notificationId) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  const notif = (users[idx].notifications || []).find((n) => n.id === notificationId);
  if (notif) notif.read = true;
  setUsers(users);
}

export function markAllNotificationsRead(userId) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  (users[idx].notifications || []).forEach((n) => { n.read = true; });
  setUsers(users);
}

// ── Replies ──

export function getReplies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPLIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setReplies(replies) {
  localStorage.setItem(STORAGE_KEYS.REPLIES, JSON.stringify(replies));
}

export function getRepliesByDoubt(doubtId) {
  return getReplies()
    .filter((r) => r.doubtId === doubtId)
    .sort((a, b) => {
      // Best answer first, then by date
      if (a.isBestAnswer !== b.isBestAnswer) return b.isBestAnswer ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
}

export function addReply(reply) {
  const replies = getReplies();
  replies.push(reply);
  setReplies(replies);
}

export function updateReply(id, updates) {
  const replies = getReplies();
  const idx = replies.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  replies[idx] = { ...replies[idx], ...updates };
  setReplies(replies);
  return replies[idx];
}

export function likeReply(replyId, userId) {
  const replies = getReplies();
  const idx = replies.findIndex((r) => r.id === replyId);
  if (idx === -1) return null;
  const reply = replies[idx];
  // Remove from dislikes if present
  reply.dislikes = (reply.dislikes || []).filter((id) => id !== userId);
  // Toggle like
  if (reply.likes.includes(userId)) {
    reply.likes = reply.likes.filter((id) => id !== userId);
  } else {
    reply.likes.push(userId);
  }
  setReplies(replies);
  return reply;
}

export function dislikeReply(replyId, userId) {
  const replies = getReplies();
  const idx = replies.findIndex((r) => r.id === replyId);
  if (idx === -1) return null;
  const reply = replies[idx];
  // Remove from likes if present
  reply.likes = (reply.likes || []).filter((id) => id !== userId);
  // Toggle dislike
  if (reply.dislikes.includes(userId)) {
    reply.dislikes = reply.dislikes.filter((id) => id !== userId);
  } else {
    reply.dislikes.push(userId);
  }
  setReplies(replies);
  return reply;
}

export function markBestAnswer(replyId, doubtId) {
  // Unmark any existing best answer for this doubt
  const replies = getReplies();
  replies.forEach((r) => {
    if (r.doubtId === doubtId) r.isBestAnswer = false;
  });
  // Mark the new best answer
  const idx = replies.findIndex((r) => r.id === replyId);
  if (idx !== -1) replies[idx].isBestAnswer = true;
  setReplies(replies);
  return replies[idx] || null;
}

// ── Reputation / Contribution Events ──

export function getEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setEvents(events) {
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

export function addEvent(event) {
  const events = getEvents();
  events.push(event);
  setEvents(events);
  return event;
}

export function getEventsByUser(userId) {
  return getEvents().filter((e) => e.userId === userId);
}

/**
 * Check if a duplicate action has already awarded points.
 * Prevents double-claiming, double-resolving, double-marking best answer, or duplicate rating for same doubt.
 */
export function hasDuplicateEvent(userId, action, { doubtId = null, replyId = null } = {}) {
  const events = getEvents();
  return events.some((e) => {
    if (e.userId !== userId || e.action !== action) return false;
    if (doubtId && e.doubtId !== doubtId) return false;
    if (replyId && e.replyId !== replyId) return false;
    return true;
  });
}

/**
 * Get events created within a specific timestamp window [startTime, endTime].
 */
export function getEventsByDateRange(startTime = 0, endTime = Infinity) {
  return getEvents().filter((e) => e.createdAt >= startTime && e.createdAt <= endTime);
}

