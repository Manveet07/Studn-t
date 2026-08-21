/* ============================================================
   models.js — User & Doubt Factory Functions + Validation
   Every page script creates/validates objects through here.

   Dependencies: store.js, categories.js
   ============================================================ */

import * as store from './store.js';
import { ACADEMIC_SKILLS, NONACADEMIC_CATEGORIES } from './categories.js';

// ── ID Generation ──

function generateId(prefix) {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

// ── User ──

/**
 * Create a new User object.
 * reputationScore seeds at 50 (neutral midpoint), NOT zero.
 * Eligibility comes from declared skills, never from reputation.
 */
export function createUser({ name, username, email, password, university, campus, year, branch, bio, academicSkills, nonAcademicSkills }) {
  return {
    id: generateId('u'),
    name: name.trim(),
    username: username.trim().toLowerCase(),
    email: (email || '').trim(),
    password: password || '',
    university: university.trim(),
    campus: (campus || '').trim(),
    year,
    branch: branch.trim(),
    bio: (bio || '').trim(),
    academicSkills: academicSkills || [],
    nonAcademicSkills: nonAcademicSkills || [],
    reputationScore: 50,
    ratingHistory: [],
    notifications: [],
    createdAt: Date.now(),
  };
}

/**
 * Validate user fields. Returns { valid: bool, errors: string[] }
 */
export function validateUser({ name, username, password, university, year, branch, academicSkills }) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }
  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters.');
  }
  if (username && store.usernameExists(username)) {
    errors.push('This username is already taken.');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }
  if (!university || university.trim().length < 2) {
    errors.push('University name is required.');
  }
  if (!year || !['1st', '2nd', '3rd', '4th'].includes(year)) {
    errors.push('Please select your year.');
  }
  if (!branch || branch.trim().length < 1) {
    errors.push('Branch is required.');
  }
  if (!academicSkills || academicSkills.length === 0) {
    errors.push('Select at least one academic skill.');
  }

  return { valid: errors.length === 0, errors };
}

// ── Doubt ──

/**
 * Create a new Doubt object.
 */
export function createDoubt({ authorId, category, tags, courseContext, description, urgency }) {
  return {
    id: generateId('d'),
    authorId,
    category,
    tags: tags || [],
    courseContext: courseContext || '',
    description: description.trim(),
    urgency: Math.max(0, Math.min(100, urgency)),
    status: 'open', // open → claimed → resolved
    claimedBy: null,
    createdAt: Date.now(),
    claimedAt: null,
    resolvedAt: null,
    ratingGiven: null, // 1-5 stars
    ratingTimestamp: null,
  };
}

/**
 * Validate doubt fields.
 */
export function validateDoubt({ category, tags, description, urgency }) {
  const errors = [];

  if (!category || !['academic', 'nonacademic'].includes(category)) {
    errors.push('Please select a category.');
  }
  if (!tags || tags.length === 0) {
    errors.push('Select at least one tag.');
  }
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters.');
  }
  if (urgency === undefined || urgency === null || urgency < 0 || urgency > 100) {
    errors.push('Urgency must be between 0 and 100.');
  }

  return { valid: errors.length === 0, errors };
}

// ── Reply ──

/**
 * Create a new Reply object.
 * Replies are answers to doubts, posted by anyone who can see the doubt.
 */
export function createReply({ authorId, doubtId, text }) {
  return {
    id: generateId('r'),
    authorId,
    doubtId,
    text: text.trim(),
    likes: [],       // array of user IDs who liked
    dislikes: [],    // array of user IDs who disliked
    isBestAnswer: false,
    createdAt: Date.now(),
  };
}

/**
 * Validate reply fields.
 */
export function validateReply({ text }) {
  const errors = [];
  if (!text || text.trim().length < 5) {
    errors.push('Reply must be at least 5 characters.');
  }
  return { valid: errors.length === 0, errors };
}

// ── Notification ──

/**
 * Create a notification object.
 * @param {string} type - 'claim' | 'resolve' | 'rate' | 'system'
 * @param {string} fromUserId - who triggered it
 * @param {string} doubtId - related doubt
 * @param {string} message - display text
 */
export function createNotification({ type, fromUserId, doubtId, message }) {
  return {
    id: generateId('n'),
    type,
    fromUserId,
    doubtId,
    message,
    read: false,
    createdAt: Date.now(),
  };
}

// ── Reputation Scoring ──

/**
 * Calculate reputation change for an action.
 * Returns the delta (positive or negative).
 */
export function getRepDelta(action, rating = null) {
  switch (action) {
    case 'claim': return 5;      // +5 for claiming a doubt
    case 'resolve': return 10;   // +10 for resolving a doubt
    case 'rate_5': return 4;     // +4 for getting 5-star
    case 'rate_4': return 3;     // +3 for getting 4-star
    case 'rate_3': return 1;     // +1 for getting 3-star
    case 'rate_2': return -1;    // -1 for getting 2-star
    case 'rate_1': return -3;    // -3 for getting 1-star
    case 'reply_liked': return 2;  // +2 for getting a reply liked
    case 'best_answer': return 15; // +15 for getting best answer
    case 'reply_disliked': return -1; // -1 for getting a reply disliked
    default: return 0;
  }
}

/**
 * Apply reputation change to a user.
 */
export function applyRepChange(userId, action, rating = null) {
  const delta = getRepDelta(action, rating);
  const user = store.getUserById(userId);
  if (!user) return;

  const newScore = Math.max(0, Math.min(100, (user.reputationScore || 50) + delta));
  store.updateUser(userId, { reputationScore: newScore });
}
