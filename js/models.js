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
    leaderboardPoints: 0,
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

// ── Reputation Scoring & Events ──

/**
 * Score points matrix based on Studn't rules:
 * - Claim doubt: +5
 * - Resolve doubt: +10
 * - Best answer: +15
 * - 5★: +4, 4★: +3, 3★: +1, 2★: -1, 1★: -3
 * - Reply liked: +2
 * - Reply disliked: -1
 */
export const REPUTATION_RULES = {
  CLAIM: 5,
  RESOLVE: 10,
  BEST_ANSWER: 15,
  RATE_5: 4,
  RATE_4: 3,
  RATE_3: 1,
  RATE_2: -1,
  RATE_1: -3,
  REPLY_LIKED: 2,
  REPLY_DISLIKED: -1,
};

/**
 * Create a new auditable Reputation/Contribution Event object.
 */
export function createReputationEvent({ userId, action, points, doubtId = null, replyId = null, rating = null, metadata = {} }) {
  return {
    id: generateId('evt'),
    userId,
    action,
    points,
    doubtId,
    replyId,
    rating,
    metadata,
    createdAt: Date.now(),
  };
}

/**
 * Calculate reputation change for an action.
 * Returns the delta (positive or negative).
 */
export function getRepDelta(action, rating = null) {
  switch (action) {
    case 'claim': return REPUTATION_RULES.CLAIM;
    case 'resolve': return REPUTATION_RULES.RESOLVE;
    case 'rate_5': return REPUTATION_RULES.RATE_5;
    case 'rate_4': return REPUTATION_RULES.RATE_4;
    case 'rate_3': return REPUTATION_RULES.RATE_3;
    case 'rate_2': return REPUTATION_RULES.RATE_2;
    case 'rate_1': return REPUTATION_RULES.RATE_1;
    case 'reply_liked': return REPUTATION_RULES.REPLY_LIKED;
    case 'best_answer': return REPUTATION_RULES.BEST_ANSWER;
    case 'reply_disliked': return REPUTATION_RULES.REPLY_DISLIKED;
    default: return 0;
  }
}

/**
 * Apply reputation change to a user (clamps between 0 and 100).
 */
export function applyRepChange(userId, action, rating = null) {
  const delta = getRepDelta(action, rating);
  const user = store.getUserById(userId);
  if (!user) return;

  const newRep = Math.max(0, Math.min(100, (user.reputationScore !== undefined ? user.reputationScore : 50) + delta));
  const newPoints = (user.leaderboardPoints || 0) + delta;
  store.updateUser(userId, {
    reputationScore: newRep,
    leaderboardPoints: newPoints,
  });
}

