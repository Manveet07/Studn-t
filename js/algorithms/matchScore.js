/* ============================================================
   matchScore.js — Skill/Category Match Algorithm
   Pure function (no DOM). Copy-pasteable server-side unchanged.

   Returns a score 0..1 indicating how well a user matches a doubt.
   - Academic: weighted Jaccard on tags (0.6) + category match (0.4)
   - Non-academic "Exam Logistics": strict exact courseContext match
   - Other non-academic: tag overlap only

   Dependencies: NONE
   ============================================================ */

/**
 * Calculate how well a user matches a given doubt.
 *
 * @param {Object} doubt - { category, tags[], courseContext, description }
 * @param {Object} user  - { academicSkills[], nonAcademicSkills[], university, year, branch }
 * @returns {number} 0..1 match score
 */
export function matchScore(doubt, user) {
  if (!doubt || !user) return 0;

  const isAcademic = doubt.category === 'academic';
  const isExamLogistics = doubt.category === 'nonacademic'
    && (doubt.tags || []).some((t) => t.toLowerCase().includes('exam'));

  if (isAcademic) {
    return academicMatch(doubt, user);
  }

  if (isExamLogistics) {
    return examLogisticsMatch(doubt, user);
  }

  // Other non-academic: simple tag overlap
  return nonAcademicMatch(doubt, user);
}

// ── Academic Match ──
// 60% tag overlap (weighted Jaccard) + 40% category match

function academicMatch(doubt, user) {
  const doubtTags = normalizeArray(doubt.tags);
  const userSkills = normalizeArray(user.academicSkills);

  const tagScore = weightedJaccard(doubtTags, userSkills);

  // Bonus: if user is in same year/branch, slightly higher
  const yearBonus = doubt.courseContext
    && user.year
    && doubt.courseContext.toLowerCase().includes(user.year.toLowerCase())
      ? 0.05
      : 0;

  // Category match: does the doubt's primary tag appear in user's skills?
  const primaryTag = doubtTags[0] || '';
  const categoryMatch = userSkills.includes(primaryTag) ? 0.4 : 0.2;

  return Math.min(1, tagScore * 0.6 + categoryMatch + yearBonus);
}

// ── Exam Logistics Match ──
// STRICT: exact courseContext match (same course + professor)
// Non-exam-logistics helpers cannot claim these.

function examLogisticsMatch(doubt, user) {
  const doubtCtx = (doubt.courseContext || '').trim().toLowerCase();
  if (!doubtCtx) return 0;

  // User must be in same university and branch
  const sameUni = (user.university || '').trim().toLowerCase() ===
    extractUniversity(doubtCtx);
  const sameBranch = (user.branch || '').trim().toLowerCase().includes(
    extractBranch(doubtCtx)
  ) || extractBranch(doubtCtx).includes((user.branch || '').trim().toLowerCase());

  // Exact courseContext match
  const userCtx = `${user.branch || ''} ${user.year || ''}`.trim().toLowerCase();
  const exactMatch = doubtCtx.includes(userCtx) || userCtx.includes(doubtCtx);

  if (exactMatch && sameUni) return 0.95;
  if (sameUni && sameBranch) return 0.7;
  if (sameUni) return 0.4;
  return 0.1;
}

// ── Non-Academic Match ──
// Simple tag overlap

function nonAcademicMatch(doubt, user) {
  const doubtTags = normalizeArray(doubt.tags);
  const userSkills = normalizeArray(user.nonAcademicSkills);

  if (doubtTags.length === 0 || userSkills.length === 0) return 0;

  return weightedJaccard(doubtTags, userSkills);
}

// ── Helpers ──

function normalizeArray(arr) {
  if (!arr) return [];
  return arr.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Weighted Jaccard similarity.
 * Later tags in the doubt carry slightly more weight (they're more specific).
 */
function weightedJaccard(a, b) {
  if (a.length === 0 && b.length === 0) return 0;

  const bSet = new Set(b);
  let intersectionWeight = 0;
  let unionWeight = a.length;

  a.forEach((tag, i) => {
    const weight = 1 + (i * 0.1); // later tags = more weight
    if (bSet.has(tag)) {
      intersectionWeight += weight;
    }
  });

  // Union includes all unique items from both sets
  const unionSize = new Set([...a, ...b]).size;

  if (unionSize === 0) return 0;
  return intersectionWeight / (unionSize * 1.1); // normalize
}

function extractUniversity(ctx) {
  // Try to extract university from courseContext string
  const parts = ctx.split(/[,\s]+/);
  return parts[0] || '';
}

function extractBranch(ctx) {
  const parts = ctx.split(/[,\s]+/);
  return parts[1] || '';
}
