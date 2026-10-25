/* ============================================================
   reputationScore.js — Decay-Weighted Reputation Algorithm
   Pure function (no DOM). Copy-pasteable server-side unchanged.

   NOT a naive average. Uses exponential decay so recent ratings
   matter more than old ones. Seeds at 50 (neutral midpoint).

   Formula:
     reputation = prevRep * decayFactor + sum(weightedRatings) / sum(weights)

   Where weight = decayFactor ^ (age_in_ratings)

   Dependencies: NONE
   ============================================================ */

/**
 * Calculate new reputation score from previous score and recent ratings.
 *
 * @param {number} previousReputation - current reputation (0..100, seeds at 50)
 * @param {Array<{ rating: number, timestamp: number }>} recentRatings
 *   - rating: 1..5 (1=bad, 5=excellent)
 *   - timestamp: Date.now() when rating was given
 * @param {number} decayFactor - how quickly old ratings fade (0..1, default 0.7)
 * @returns {number} new reputation score clamped to 0..100
 */
export function reputationScore(previousReputation, recentRatings, decayFactor = 0.7) {
  if (!recentRatings || recentRatings.length === 0) {
    // No ratings — stay at previous reputation (or seed at 50)
    return Math.max(0, Math.min(100, previousReputation || 50));
  }

  // Sort ratings by timestamp (oldest first)
  const sorted = [...recentRatings].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate decay-weighted average of ratings
  let weightedSum = 0;
  let weightTotal = 0;

  sorted.forEach((r, index) => {
    const weight = Math.pow(decayFactor, sorted.length - 1 - index);
    // Normalize 1..5 rating to 0..1
    const normalizedRating = Math.max(0, Math.min(1, (r.rating - 1) / 4));
    weightedSum += normalizedRating * weight;
    weightTotal += weight;
  });

  const weightedAverage = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Convert 0..1 average to 0..100 score
  const ratingContribution = weightedAverage * 100;

  // Blend: 40% previous reputation + 60% new ratings
  // This prevents massive swings from a single rating
  const BLEND_FACTOR = 0.6;
  const newReputation = (previousReputation || 50) * (1 - BLEND_FACTOR)
    + ratingContribution * BLEND_FACTOR;

  return Math.max(0, Math.min(100, Math.round(newReputation)));
}

/**
 * Add a new rating to a user's history and compute their new reputation.
 * This is the convenience wrapper for store-level operations.
 *
 * @param {Object} user - user object with reputationScore and ratingHistory
 * @param {number} rating - 1..5
 * @returns {{ newReputation: number, updatedHistory: Array }}
 */
export function addRating(user, rating) {
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));

  const newEntry = {
    rating: clampedRating,
    timestamp: Date.now(),
  };

  const updatedHistory = [...(user.ratingHistory || []), newEntry];
  const newRep = reputationScore(user.reputationScore, updatedHistory);

  return {
    newReputation: newRep,
    updatedHistory,
  };
}

/**
 * Get reputation level label from score.
 */
export function getRepLevel(score) {
  if (score >= 80) return 'Legendary';
  if (score >= 60) return 'Trusted';
  if (score >= 40) return 'Rising';
  if (score >= 20) return 'Newcomer';
  return 'Beginner';
}

/**
 * Get reputation color for UI display.
 */
export function getRepColor(score) {
  if (score >= 80) return '#34d399'; // green
  if (score >= 60) return '#60a5fa'; // blue
  if (score >= 40) return '#fbbf24'; // yellow
  if (score >= 20) return '#e8863a'; // orange
  return '#f87171'; // red
}
