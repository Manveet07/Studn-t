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
    (u) => u.username.toLowerCase() === username.toLowerCase()
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
