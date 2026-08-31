/* ============================================================
   priorityScore.js — Doubt Ranking Algorithm
   Pure function (no DOM). Copy-pasteable server-side unchanged.

   Combines three factors into a single priority score:
   1. Helper availability (reputation + active status)
   2. Match strength (from matchScore.js)
   3. Wait time (longer wait = higher priority to find a helper)

   Tie-break: earlier createdAt wins.

   Dependencies: matchScore.js (imported)
   ============================================================ */

import { matchScore } from './matchScore.js';

/**
 * Rank candidate helpers for a given doubt.
 * Returns an array sorted by priority (highest first).
 *
 * @param {Object} doubt - the doubt object
 * @param {Object[]} candidateUsers - array of user objects who could help
 * @param {number} now - current timestamp (Date.now())
 * @param {Object|null} [author=null] - optional doubt author object
 * @returns {Array<{ user: Object, score: number, match: number }>}
 */
export function priorityScore(doubt, candidateUsers, now, author = null) {
  if (!doubt || !candidateUsers || candidateUsers.length === 0) return [];

  const waitMinutes = Math.max(0, (now - doubt.createdAt) / (1000 * 60));

  const scored = candidateUsers
    .filter((user) => user.id !== doubt.authorId) // can't claim your own doubt
    .map((user) => {
      const match = matchScore(doubt, user, author);
      const availability = availabilityScore(user, now);
      const waitFactor = waitTimeFactor(waitMinutes);

      // Weighted combination
      // match: 50%, availability: 30%, wait: 20%
      const score = (match * 0.50) + (availability * 0.30) + (waitFactor * 0.20);

      return { user, score, match, availability, waitFactor };
    })
    .filter((entry) => entry.match > 0.1) // minimum match threshold
    .sort((a, b) => {
      // Primary: score descending
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break: earlier createdAt wins
      return a.user.createdAt - b.user.createdAt;
    });

  return scored;
}

/**
 * Simple priority score for a single user-doubt pair.
 * Returns 0..1.
 *
 * @param {Object} doubt
 * @param {Object} user
 * @param {number} now
 * @param {Object|null} [author=null]
 * @returns {number}
 */
export function singlePriorityScore(doubt, user, now, author = null) {
  if (!doubt || !user) return 0;
  if (user.id === doubt.authorId) return 0;

  const match = matchScore(doubt, user, author);
  if (match <= 0.1) return 0;

  const availability = availabilityScore(user, now);
  const waitMinutes = Math.max(0, (now - doubt.createdAt) / (1000 * 60));
  const waitFactor = waitTimeFactor(waitMinutes);

  return (match * 0.50) + (availability * 0.30) + (waitFactor * 0.20);
}

// ── Sub-scores ──

/**
 * Availability score based on reputation and recent activity.
 * Higher reputation = more available/trusted.
 * Users who recently helped are slightly prioritized (fresh expertise).
 *
 * @returns 0..1
 */
function availabilityScore(user, now) {
  const rep = user.reputationScore || 50;
  const repNormalized = rep / 100; // 0..1

  // Recency bonus: if user helped someone in last 24h
  const recentHelp = (user.ratingHistory || []).some((r) => {
    const age = now - r.timestamp;
    return age < 24 * 60 * 60 * 1000; // 24 hours
  });

  const recencyBonus = recentHelp ? 0.1 : 0;

  return Math.min(1, repNormalized + recencyBonus);
}

/**
 * Wait time factor.
 * Doubts that have been waiting longer get a higher priority
 * to ensure they eventually find a helper.
 * Sigmoid-like curve that plateaus around 60 minutes.
 *
 * @param {number} waitMinutes - how long the doubt has been waiting
 * @returns 0..1
 */
function waitTimeFactor(waitMinutes) {
  // Rapid rise in first 30 minutes, plateaus after 60
  if (waitMinutes <= 0) return 0.1;
  if (waitMinutes >= 60) return 1;

  // Smooth curve: 1 - e^(-k * t)
  const k = 0.04;
  return 0.1 + 0.9 * (1 - Math.exp(-k * waitMinutes));
}
