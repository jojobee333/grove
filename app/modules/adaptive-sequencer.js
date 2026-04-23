/**
 * Adaptive Lesson Sequencer — reorder unlocked lessons based on concept struggle signals.
 *
 * Struggle signals come from two sources:
 *   - Open mistake journal entries (weighted by attempt count)
 *   - Recent high-confidence misses from the confidence log
 *
 * Pure functions — no DOM, no side-effects.
 */

const DEFAULT_RECENT_SESSION_COUNT = 3;

/**
 * Build a map of conceptId → struggle score from the mistake journal and confidence log.
 * Open mistakes contribute their attempt count. High-confidence misses add 1 each.
 *
 * @param {object|null} mistakeJournal
 * @param {object|null} confidenceLog
 * @param {number}      recentSessionCount - Approx how many sessions back to look in confidence log
 * @returns {Map<string, number>}
 */
function getConceptStruggleCounts(mistakeJournal, confidenceLog, recentSessionCount) {
  const counts = new Map();

  // Open mistakes: weighted by attempt count
  for (const entry of mistakeJournal?.entries ?? []) {
    if (entry.status === 'resolved') continue;
    for (const cid of entry.conceptIds ?? []) {
      counts.set(cid, (counts.get(cid) ?? 0) + (entry.attempts ?? 1));
    }
  }

  // Recent high-confidence misses: each adds 1
  const recentEntries = [...(confidenceLog?.entries ?? [])].slice(-(recentSessionCount * 10));
  for (const entry of recentEntries) {
    if (entry.confidence === 'high' && !entry.correct) {
      for (const cid of entry.conceptIds ?? []) {
        counts.set(cid, (counts.get(cid) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Score a single lesson by how much its taught concepts overlap with current struggle signals.
 * Higher score = more urgently needed.
 *
 * @param {{ teaches_concepts?: string[] }} lesson
 * @param {{ mistakeJournal?: object, confidenceLog?: object, recentSessionCount?: number }} opts
 * @returns {number}
 */
export function scoreLesson(lesson, { mistakeJournal, confidenceLog, recentSessionCount = DEFAULT_RECENT_SESSION_COUNT } = {}) {
  const struggles = getConceptStruggleCounts(mistakeJournal, confidenceLog, recentSessionCount);
  let score = 0;
  for (const conceptId of lesson.teaches_concepts ?? []) {
    score += struggles.get(conceptId) ?? 0;
  }
  return score;
}

/**
 * Return a new array of lessons sorted so that lessons covering struggled concepts
 * come first. Lessons with equal scores preserve their original relative order.
 *
 * @param {Array<object>} nextLessons
 * @param {{ mistakeJournal?: object, confidenceLog?: object, recentSessionCount?: number }} opts
 * @returns {Array<object>} New sorted array (input not mutated)
 */
export function reorderByStruggle(nextLessons, { mistakeJournal, confidenceLog, recentSessionCount = DEFAULT_RECENT_SESSION_COUNT } = {}) {
  if (!Array.isArray(nextLessons) || nextLessons.length <= 1) return nextLessons ?? [];

  // Stable sort: attach original index for tiebreaking
  return [...nextLessons]
    .map((lesson, idx) => ({ lesson, idx, score: scoreLesson(lesson, { mistakeJournal, confidenceLog, recentSessionCount }) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map(item => item.lesson);
}
