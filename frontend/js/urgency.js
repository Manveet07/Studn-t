/* ============================================================
   urgency.js — Smart Urgency System
   Pure utility (no DOM). Import anywhere.

   The 4 urgency levels replace the raw 0-100 slider.
   Each level has a fixed numeric midpoint stored in the
   doubt object — old doubts with arbitrary numbers are
   still handled gracefully via getUrgencyLevel().

   Dependencies: NONE
   ============================================================ */

/**
 * All urgency levels, ordered highest to lowest priority.
 * value   - numeric midpoint stored in doubt.urgency
 * factor  - 0..1 weight used by priorityScore.js
 * barPct  - fill % of the urgency bar
 */
export const URGENCY_LEVELS = [
  {
    key:         'critical',
    value:       87,
    label:       'Critical',
    icon:        '🔴',
    tagline:     'Exam within 2 hours',
    description: 'Highest priority — pushed to top of the live doubt pool immediately.',
    impact:      'Boosted to top of helper queue',
    cssClass:    'critical',
    factor:      1.0,
    barPct:      100,
    min:         75,
    max:         100,
  },
  {
    key:         'high',
    value:       62,
    label:       'High',
    icon:        '🟠',
    tagline:     'Exam today',
    description: 'High priority — surfaced prominently for quick helper response.',
    impact:      'Pushed above standard matches',
    cssClass:    'high',
    factor:      0.70,
    barPct:      70,
    min:         50,
    max:         74,
  },
  {
    key:         'normal',
    value:       37,
    label:       'Normal',
    icon:        '🟡',
    tagline:     'Need help soon',
    description: 'Standard priority — matched by skill and availability.',
    impact:      'Balanced visibility in the pool',
    cssClass:    'normal',
    factor:      0.40,
    barPct:      40,
    min:         25,
    max:         49,
  },
  {
    key:         'low',
    value:       12,
    label:       'Low',
    icon:        '🟢',
    tagline:     'Learning / curiosity',
    description: 'Low priority — no rush, best-effort matching.',
    impact:      'Visible when helpers are available',
    cssClass:    'low',
    factor:      0.15,
    barPct:      15,
    min:         0,
    max:         24,
  },
];

/**
 * Map a raw 0-100 urgency number to a level object.
 * Handles legacy values and out-of-range input gracefully.
 *
 * @param {number} value - doubt.urgency (0..100)
 * @returns {Object} one of URGENCY_LEVELS entries
 */
export function getUrgencyLevel(value) {
  const v = typeof value === 'number' ? value : 50;
  return (
    URGENCY_LEVELS.find((lvl) => v >= lvl.min && v <= lvl.max) ||
    URGENCY_LEVELS[2] // default: Normal
  );
}

/**
 * Return the 0..1 priority factor for a doubt's urgency.
 * Used by priorityScore.js.
 *
 * @param {number} value - doubt.urgency (0..100)
 * @returns {number} 0..1
 */
export function urgencyToPriorityFactor(value) {
  return getUrgencyLevel(value).factor;
}
