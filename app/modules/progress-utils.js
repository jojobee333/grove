/**
 * Pure progress utility functions.
 * Accept all dependencies as explicit parameters — no globals.
 */

/**
 * Returns the completion percentage (0–100) for a module.
 *
 * @param {{ lessons?: Array<{ id: string }> }} m        - Module object
 * @param {{ lessons: Record<string,unknown> }} progress  - Progress object
 * @returns {number} Percentage 0–100
 */
export function moduleProgress(m, progress) {
  const lessons = m.lessons ?? [];
  if (!lessons.length) return 0;

  const done = lessons.filter(l => progress.lessons[l.id]).length;
  return Math.round((done / lessons.length) * 100);
}

/**
 * Returns true when a lesson's prerequisites are not yet satisfied.
 *
 * @param {{ prerequisites?: string[], unlock_rule?: string }} lesson
 * @param {{ lessons: Record<string,unknown> }} progress
 * @returns {boolean}
 */
export function isLessonLocked(lesson, progress) {
  const prereqs = lesson.prerequisites ?? [];
  if (!prereqs.length) return false;

  const completed = new Set(Object.keys(progress.lessons ?? {}));
  const rule      = lesson.unlock_rule ?? 'all_prerequisites_mastered';

  if (rule === 'any_prerequisite_mastered') {
    return !prereqs.some(pid => completed.has(pid));
  }
  return !prereqs.every(pid => completed.has(pid));
}
