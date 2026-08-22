/* ============================================================
   leaderboardService.js — Core Leaderboard Engine & Service
   
   Flow:
   User action -> backend validates action -> create contribution event
   -> calculate points -> update user stats -> calculate ranking -> return leaderboard.

   Single source of truth for all ranking & score calculations.
   Competition ranking algorithm: 1, 2, 2, 4
   Timeframe date filtering: all-time, weekly, monthly
   Dependencies: store.js, models.js
   ============================================================ */

import * as store from '../store.js';
import { createReputationEvent, getRepDelta, REPUTATION_RULES } from '../models.js';

// Timeframe duration constants in milliseconds
export const TIMEFRAMES = {
  ALL: 'all',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
};

const DURATION_MS = {
  [TIMEFRAMES.WEEKLY]: 7 * 24 * 60 * 60 * 1000,
  [TIMEFRAMES.MONTHLY]: 30 * 24 * 60 * 60 * 1000,
  [TIMEFRAMES.ALL]: Infinity,
};

/**
 * Validate and record a reputation / contribution event.
 * Idempotent: rejects duplicate point awards for unique actions.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.action - 'claim' | 'resolve' | 'best_answer' | 'rate_1'..'rate_5' | 'reply_liked' | 'reply_disliked'
 * @param {string} [params.doubtId]
 * @param {string} [params.replyId]
 * @param {number} [params.rating]
 * @param {Object} [params.metadata]
 * @returns {{ success: boolean, event?: Object, user?: Object, error?: string }}
 */
export function recordContributionEvent({ userId, action, doubtId = null, replyId = null, rating = null, metadata = {} }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const user = store.getUserById(userId);
  if (!user) {
    return { success: false, error: `User ${userId} not found.` };
  }

  // Idempotency check for single-occurrence events
  const isUniqueAction = ['claim', 'resolve', 'best_answer'].includes(action) || action.startsWith('rate_');
  if (isUniqueAction && store.hasDuplicateEvent(userId, action, { doubtId, replyId })) {
    return { success: false, error: `Duplicate action: ${action} points already awarded.` };
  }

  // Calculate points delta using the official scoring rules
  const pointsDelta = getRepDelta(action, rating);
  if (pointsDelta === 0 && !action.startsWith('rate_')) {
    return { success: false, error: `Invalid action: ${action}` };
  }

  // Create immutable auditable event
  const event = createReputationEvent({
    userId,
    action,
    points: pointsDelta,
    doubtId,
    replyId,
    rating,
    metadata,
  });

  // Persist event in store
  store.addEvent(event);

  // Update user stats
  // reputationScore clamped strictly [0, 100], seeds at 50
  const currentRep = user.reputationScore !== undefined ? user.reputationScore : 50;
  const newReputation = Math.max(0, Math.min(100, currentRep + pointsDelta));

  // leaderboardPoints uncapped contribution score
  const currentPoints = user.leaderboardPoints || 0;
  const newPoints = currentPoints + pointsDelta;

  const updatedUser = store.updateUser(userId, {
    reputationScore: newReputation,
    leaderboardPoints: newPoints,
  });

  return {
    success: true,
    event,
    user: updatedUser,
  };
}

/**
 * Get the timestamp window for a given timeframe filter.
 */
export function getTimeframeWindow(timeframe = TIMEFRAMES.ALL) {
  const now = Date.now();
  const duration = DURATION_MS[timeframe] || Infinity;
  const startTime = duration === Infinity ? 0 : now - duration;
  return { startTime, endTime: now };
}

/**
 * Calculate competition ranks for a sorted list of users.
 * Standard Competition Ranking (1, 2, 2, 4):
 * Items that tie get the same rank, and a gap is left in subsequent rankings.
 * 
 * Sort order:
 * 1. points DESC
 * 2. reputationScore DESC
 * 3. contributionsCount DESC
 */
export function assignCompetitionRanks(rankedUsers) {
  return rankedUsers.map((item, index) => {
    if (index === 0) {
      item.rank = 1;
      return item;
    }

    const prev = rankedUsers[index - 1];
    const isTied =
      item.points === prev.points &&
      item.reputationScore === prev.reputationScore &&
      item.contributionsCount === prev.contributionsCount;

    if (isTied) {
      item.rank = prev.rank;
    } else {
      // Competition ranking: rank is 1 + total items ahead
      item.rank = index + 1;
    }

    return item;
  });
}

/**
 * Query the leaderboard.
 * 
 * @param {Object} options
 * @param {'all'|'weekly'|'monthly'} [options.timeframe='all']
 * @param {string} [options.campus] - Optional campus filter
 * @param {number} [options.limit=50] - Number of ranked entries to return
 * @returns {Object} Leaderboard payload
 */
export function getLeaderboard({ timeframe = TIMEFRAMES.ALL, campus = null, limit = 50 } = {}) {
  const users = store.getUsers();
  const { startTime, endTime } = getTimeframeWindow(timeframe);
  const events = store.getEventsByDateRange(startTime, endTime);

  // Group events by userId
  const userEventMap = new Map();
  events.forEach((evt) => {
    if (!userEventMap.has(evt.userId)) {
      userEventMap.set(evt.userId, { points: 0, contributions: 0, events: [] });
    }
    const record = userEventMap.get(evt.userId);
    record.points += evt.points || 0;
    if ((evt.points || 0) > 0 || ['claim', 'resolve', 'best_answer'].includes(evt.action)) {
      record.contributions += 1;
    }
    record.events.push(evt);
  });

  // Build ranking items for each user
  let candidates = users.map((user) => {
    const activity = userEventMap.get(user.id);
    let points = 0;
    let contributionsCount = 0;

    if (timeframe === TIMEFRAMES.ALL) {
      // For all-time: use tracked events if available, otherwise user.leaderboardPoints
      if (activity && activity.events.length > 0) {
        points = activity.points;
        contributionsCount = activity.contributions;
      } else {
        points = user.leaderboardPoints || 0;
        contributionsCount = 0;
      }
    } else {
      // For weekly / monthly: only events within the window count towards period points
      points = activity ? activity.points : 0;
      contributionsCount = activity ? activity.contributions : 0;
    }

    const reputationScore = user.reputationScore !== undefined ? user.reputationScore : 50;

    return {
      userId: user.id,
      name: user.name,
      username: user.username,
      university: user.university || '',
      campus: user.campus || '',
      year: user.year || '',
      branch: user.branch || '',
      bio: user.bio || '',
      avatar: user.avatar || null,
      reputationScore,
      points,
      contributionsCount,
      createdAt: user.createdAt || 0,
    };
  });

  // Only include active contributors who have earned points or contributed in this timeframe
  candidates = candidates.filter((u) => u.points > 0 || u.contributionsCount > 0);

  // Apply optional campus filter
  if (campus && campus.trim()) {
    const campusLower = campus.trim().toLowerCase();
    candidates = candidates.filter((u) =>
      (u.campus && u.campus.toLowerCase() === campusLower) ||
      (u.university && u.university.toLowerCase() === campusLower)
    );
  }

  // Multi-key sort:
  // 1. points DESC
  // 2. reputationScore DESC
  // 3. contributionsCount DESC
  // 4. createdAt ASC (seniority tiebreak)
  candidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.reputationScore !== a.reputationScore) return b.reputationScore - a.reputationScore;
    if (b.contributionsCount !== a.contributionsCount) return b.contributionsCount - a.contributionsCount;
    return a.createdAt - b.createdAt;
  });

  // Assign standard competition ranks (1, 2, 2, 4)
  const ranked = assignCompetitionRanks(candidates);

  // Top 3 Podium (1st, 2nd, 3rd)
  const top3 = ranked.slice(0, 3);
  const podium = {
    first: top3[0] || null,
    second: top3[1] || null,
    third: top3[2] || null,
  };

  return {
    timeframe,
    campusFilter: campus || null,
    totalParticipants: ranked.length,
    podium,
    rankings: ranked.slice(0, limit),
    generatedAt: Date.now(),
  };
}

/**
 * Get current user's personal rank & stats on the leaderboard.
 */
export function getCurrentUserRank(userId, timeframe = TIMEFRAMES.ALL) {
  if (!userId) return null;
  const board = getLeaderboard({ timeframe, limit: 1000 });
  const entry = board.rankings.find((r) => r.userId === userId);
  return entry || null;
}
