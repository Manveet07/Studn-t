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
    status: 'open',
    claimedBy: null,
    createdAt: Date.now(),
    claimedAt: null,
    resolvedAt: null,
    ratingGiven: null,
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
