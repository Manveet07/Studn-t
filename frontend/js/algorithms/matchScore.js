/* ============================================================
   matchScore.js — Skill/Category Match Algorithm (V3)
   Pure function (no DOM). Copy-pasteable server-side unchanged.

   Returns a score 0..1 indicating how well a user matches a doubt.
   Enhanced with:
   - getMatchExplanation: Detailed human-readable explainable matching breakdown
   - Exact & multi-tag skill overlap
   - Author campus & university proximity
   - Branch & Academic Year alignment
   - Doubt recency & helper activity bonus

   Dependencies: NONE
   ============================================================ */

/**
 * Calculate how well a user matches a given doubt.
 *
 * @param {Object} doubt - { category, tags[], courseContext, description, authorId, createdAt, urgency }
 * @param {Object} user  - { id, academicSkills[], nonAcademicSkills[], university, campus, year, branch, reputationScore }
 * @param {Object|null} [author=null] - optional author user object for campus/branch comparison
 * @returns {number} 0..1 match score
 */
export function matchScore(doubt, user, author = null) {
  if (!doubt || !user) return 0;
  if (doubt.authorId === user.id) return 0; // can't claim your own doubt

  const explanation = computeMatchDetails(doubt, user, author);
  return explanation.score;
}

/**
 * Get an explainable, structured breakdown of why a user was matched to a doubt.
 *
 * @param {Object} doubt - the doubt object
 * @param {Object} user - the viewing user / helper
 * @param {Object|null} [author=null] - the doubt author object
 * @returns {Object} { score, percentage, matchLabel, reasons: [], breakdown: {} }
 */
export function getMatchExplanation(doubt, user, author = null) {
  if (!doubt || !user) {
    return {
      score: 0,
      percentage: 0,
      matchLabel: 'NO MATCH',
      reasons: [],
      breakdown: { skillScore: 0, campusScore: 0, academicScore: 0, activityScore: 0 },
    };
  }

  return computeMatchDetails(doubt, user, author);
}

/**
 * Internal core computation for matching score and reasons.
 */
function computeMatchDetails(doubt, user, author = null) {
  const isAcademic = doubt.category === 'academic';
  const isExamLogistics = doubt.category === 'nonacademic'
    && (doubt.tags || []).some((t) => t.toLowerCase().includes('exam'));

  const doubtTags = normalizeArray(doubt.tags);
  const userAcademicSkills = normalizeArray(user.academicSkills);
  const userNonAcademicSkills = normalizeArray(user.nonAcademicSkills);
  const allUserSkills = [...new Set([...userAcademicSkills, ...userNonAcademicSkills])];

  // 1. Skill & Tag Analysis
  const primarySkills = isAcademic ? userAcademicSkills : userNonAcademicSkills;
  const secondarySkills = isAcademic ? userNonAcademicSkills : userAcademicSkills;

  const matchedSkills = [];
  const matchedTags = [];

  doubtTags.forEach((tag) => {
    // Check exact & sub-term match in user skills
    const matchingUserSkill = allUserSkills.find((skill) => isTagMatch(tag, skill));
    if (matchingUserSkill) {
      matchedTags.push(tag);
      if (!matchedSkills.includes(matchingUserSkill)) {
        matchedSkills.push(matchingUserSkill);
      }
    }
  });

  // Calculate skill score
  let skillScore = 0;
  if (doubtTags.length > 0) {
    const overlapRatio = matchedTags.length / doubtTags.length;
    const primarySkillMatch = doubtTags[0] && allUserSkills.some((s) => isTagMatch(doubtTags[0], s));

    if (isExamLogistics) {
      skillScore = examLogisticsSkillMatch(doubt, user, author);
    } else {
      const baseJaccard = weightedJaccard(doubtTags, allUserSkills);
      const overlapWeight = overlapRatio * 0.45;
      const primaryBonus = primarySkillMatch ? 0.15 : 0.05;
      skillScore = Math.min(0.60, baseJaccard * 0.40 + overlapWeight + primaryBonus);
      if (matchedTags.length > 0 && skillScore < 0.35) {
        skillScore = 0.35 + (matchedTags.length * 0.1);
      }
    }
  } else {
    skillScore = 0.20;
  }

  // 2. Campus & Proximity Bonus (0 .. 0.15)
  let campusScore = 0;
  let isSameCampus = false;
  let isSameUniversity = false;

  const userCampus = (user.campus || '').trim().toLowerCase();
  const authorCampus = author ? (author.campus || '').trim().toLowerCase() : '';
  const userUni = (user.university || '').trim().toLowerCase();
  const authorUni = author ? (author.university || '').trim().toLowerCase() : '';

  if (author) {
    if (userCampus && authorCampus && userCampus === authorCampus) {
      isSameCampus = true;
      isSameUniversity = true;
      campusScore = 0.15;
    } else if (userUni && authorUni && (userUni === authorUni || userUni.includes(authorUni) || authorUni.includes(userUni))) {
      isSameUniversity = true;
      campusScore = 0.10;
    }
  }

  if (!campusScore && doubt.courseContext) {
    const ctx = doubt.courseContext.toLowerCase();
    if (userCampus && ctx.includes(userCampus)) {
      isSameCampus = true;
      campusScore = 0.12;
    } else if (userUni && ctx.includes(userUni)) {
      isSameUniversity = true;
      campusScore = 0.08;
    }
  }

  if (!campusScore) {
    campusScore = 0.04;
  }

  // 3. Academic Year & Branch Alignment (0 .. 0.15)
  let academicScore = 0;
  const userBranch = (user.branch || '').trim().toLowerCase();
  const authorBranch = author ? (author.branch || '').trim().toLowerCase() : '';
  const userYear = (user.year || '').trim().toLowerCase();
  const authorYear = author ? (author.year || '').trim().toLowerCase() : '';

  let sameBranch = false;
  let yearAligned = false;

  if (author) {
    if (userBranch && authorBranch && (userBranch === authorBranch || userBranch.includes(authorBranch) || authorBranch.includes(userBranch))) {
      sameBranch = true;
      academicScore += 0.08;
    }
    if (userYear && authorYear) {
      if (userYear === authorYear) {
        yearAligned = true;
        academicScore += 0.05;
      } else {
        const uY = parseInt(userYear, 10);
        const aY = parseInt(authorYear, 10);
        if (!isNaN(uY) && !isNaN(aY) && uY >= aY) {
          yearAligned = true;
          academicScore += 0.06; // Senior helper bonus
        }
      }
    }
  }

  if (doubt.courseContext) {
    const ctx = doubt.courseContext.toLowerCase();
    if (userBranch && ctx.includes(userBranch)) {
      sameBranch = true;
      academicScore = Math.max(academicScore, 0.08);
    }
    if (userYear && ctx.includes(userYear)) {
      yearAligned = true;
      academicScore = Math.max(academicScore, academicScore + 0.05);
    }
  }

  if (!sameBranch && !yearAligned) {
    academicScore = Math.max(academicScore, 0.03);
  }

  // 4. Activity & Recency (0 .. 0.10)
  let activityScore = 0;
  const ageMs = Math.max(0, Date.now() - (doubt.createdAt || Date.now()));
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  if (ageMs < oneHour) {
    activityScore += 0.06;
  } else if (ageMs < oneDay) {
    activityScore += 0.04;
  } else {
    activityScore += 0.02;
  }

  if ((user.reputationScore || 50) >= 60 || (user.ratingHistory || []).length > 0) {
    activityScore += 0.04;
  }

  // Combine total score (clamped between 0.10 and 0.98)
  let totalScore = skillScore + campusScore + academicScore + activityScore;
  totalScore = Math.max(0.10, Math.min(0.98, totalScore));

  const percentage = Math.round(totalScore * 100);

  // Determine Match Label
  let matchLabel = 'GOOD MATCH';
  if (percentage >= 85) {
    matchLabel = 'EXCELLENT MATCH';
  } else if (percentage >= 70) {
    matchLabel = 'STRONG MATCH';
  } else if (percentage >= 50) {
    matchLabel = 'GOOD MATCH';
  } else if (percentage >= 35) {
    matchLabel = 'MODERATE MATCH';
  } else {
    matchLabel = 'POTENTIAL MATCH';
  }

  // Build Structured Reasons (🎯, 🎓, 📚, ⚡)
  const reasons = [];

  // 1. Skill Reason (🎯)
  let skillTitle = '';
  let skillDesc = '';
  if (matchedSkills.length > 0) {
    const formattedSkills = matchedSkills.map(capitalizeSkill).join(', ');
    skillTitle = `${formattedSkills} — exact skill match`;
    skillDesc = `Matches your verified expertise in ${formattedSkills}`;
  } else if (matchedTags.length > 0) {
    const formattedTags = matchedTags.map(capitalizeSkill).join(', ');
    skillTitle = `${formattedTags} — topic overlap`;
    skillDesc = `Relevant to your academic interest in ${formattedTags}`;
  } else {
    const primaryDoubtTag = doubt.tags && doubt.tags[0] ? doubt.tags[0] : (doubt.category === 'academic' ? 'Academic' : 'General');
    skillTitle = `${primaryDoubtTag} — relevant subject domain`;
    skillDesc = `Aligns with your profile category and peer problem-solving scope`;
  }

  reasons.push({
    icon: '🎯',
    title: skillTitle,
    description: skillDesc,
    type: 'skill',
    matched: matchedSkills.length > 0 || matchedTags.length > 0,
    highlight: matchedSkills[0] || matchedTags[0] || '',
  });

  // 2. Campus Reason (🎓)
  let campusTitle = isSameCampus ? 'Same campus' : (isSameUniversity ? 'Same university' : 'Campus peer network');
  let campusDesc = '';
  if (isSameCampus) {
    campusDesc = `Both at ${author?.campus || user.campus || 'same campus'} for quick collaboration`;
  } else if (isSameUniversity) {
    campusDesc = `Shared ${author?.university || user.university || 'university'} academic curriculum`;
  } else {
    campusDesc = 'Cross-campus student peer support network';
  }

  reasons.push({
    icon: '🎓',
    title: campusTitle,
    description: campusDesc,
    type: 'campus',
    matched: isSameCampus || isSameUniversity,
    highlight: author ? (author.campus || author.university || '') : (user.campus || user.university || ''),
  });

  // 3. Branch & Year Reason (📚)
  let academicTitle = '';
  let academicDesc = '';
  if (sameBranch && yearAligned) {
    academicTitle = `${user.year || ''} Year ${user.branch || ''}`.trim();
    academicDesc = 'Exact branch & academic year curriculum alignment';
  } else if (sameBranch) {
    academicTitle = `${user.branch || 'Engineering'} branch context`;
    academicDesc = 'Departmental coursework & syllabus familiarity';
  } else if (user.year) {
    academicTitle = `${user.year} Year academic alignment`;
    academicDesc = 'Peer-level academic understanding and course level';
  } else {
    academicTitle = 'Branch & year alignment';
    academicDesc = 'Shared syllabus and course foundation';
  }

  reasons.push({
    icon: '📚',
    title: academicTitle || 'Academic alignment',
    description: academicDesc,
    type: 'academic',
    matched: sameBranch || yearAligned,
    highlight: user.branch || user.year || '',
  });

  // 4. Activity / Recency Reason (⚡)
  const isRecent = ageMs < oneHour;
  reasons.push({
    icon: '⚡',
    title: isRecent ? 'Active recently' : 'High response priority',
    description: isRecent
      ? 'Doubt posted recently with high active helper response rate'
      : 'Ready for quick peer assistance and answer resolution',
    type: 'activity',
    matched: isRecent || activityScore >= 0.06,
    highlight: isRecent ? 'Active recently' : '',
  });

  return {
    score: totalScore,
    percentage,
    matchLabel,
    reasons,
    breakdown: {
      skillScore: Math.round(skillScore * 100) / 100,
      campusScore: Math.round(campusScore * 100) / 100,
      academicScore: Math.round(academicScore * 100) / 100,
      activityScore: Math.round(activityScore * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
    },
  };
}

// ── Exam Logistics Match ──

function examLogisticsSkillMatch(doubt, user, author) {
  const doubtCtx = (doubt.courseContext || '').trim().toLowerCase();
  const userUni = (user.university || '').trim().toLowerCase();
  const userBranch = (user.branch || '').trim().toLowerCase();
  const authorUni = author ? (author.university || '').trim().toLowerCase() : '';

  const sameUni = userUni && (userUni === authorUni || doubtCtx.includes(userUni));
  const sameBranch = userBranch && ((author && author.branch && author.branch.toLowerCase().includes(userBranch)) || doubtCtx.includes(userBranch));

  if (sameUni && sameBranch) return 0.58;
  if (sameUni) return 0.45;
  return 0.30;
}

// ── Tag Matching Helper ──

function isTagMatch(doubtTag, userSkill) {
  if (!doubtTag || !userSkill) return false;
  const dt = doubtTag.trim().toLowerCase();
  const us = userSkill.trim().toLowerCase();

  if (dt === us) return true;
  if (us.includes(dt) || dt.includes(us)) return true;

  // Split slashes, hyphens, spaces (e.g. 'programming/dsa' matches 'dsa' or 'programming')
  const dtParts = dt.split(/[\/\-,\s]+/).filter((p) => p.length > 2);
  const usParts = us.split(/[\/\-,\s]+/).filter((p) => p.length > 2);

  return dtParts.some((p) => usParts.includes(p) || us.includes(p)) ||
         usParts.some((p) => dtParts.includes(p) || dt.includes(p));
}

// ── Helpers ──

function normalizeArray(arr) {
  if (!arr) return [];
  return arr.map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : '')).filter(Boolean);
}

function capitalizeSkill(str) {
  if (!str) return '';
  return str.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Weighted Jaccard similarity.
 */
function weightedJaccard(a, b) {
  if (a.length === 0 && b.length === 0) return 0;

  const bNormalized = b.map((s) => s.toLowerCase());
  let intersectionWeight = 0;

  a.forEach((tag, i) => {
    const weight = 1 + (i * 0.1);
    const hasMatch = bNormalized.some((skill) => isTagMatch(tag, skill));
    if (hasMatch) {
      intersectionWeight += weight;
    }
  });

  const unionSize = new Set([...a, ...bNormalized]).size;
  if (unionSize === 0) return 0;

  return Math.min(1, intersectionWeight / Math.max(1, a.length));
}

